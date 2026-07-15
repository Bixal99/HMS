"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import {
  optimisticRestore,
  slideStep,
  slotConfirmPulse,
  staggerCards,
} from "@/lib/motion";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput, isTypeaheadBusy } from "@/components/shared/SearchInput";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

type Doctor = {
  id: string;
  designation: string;
  specialization: string | null;
  user: { name: string | null; email: string };
  department: { id: string; name: string };
};

type Slot = {
  start: string;
  available: boolean;
  reason?: "booked" | "past";
};

type PatientHit = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
};

type BookingFlowProps = {
  mode: "staff" | "patient";
  departmentId?: string;
  initialReason?: string;
  intakeId?: string | null;
  /** Direct-path red flags — create a minimal urgent intake at book time when set */
  pendingRedFlags?: string[];
};

export function BookingFlow({
  mode,
  departmentId,
  initialReason = "",
  intakeId = null,
  pendingRedFlags = [],
}: BookingFlowProps) {
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [reason, setReason] = useState(initialReason);
  const [month, setMonth] = useState<Date>(startOfDay(new Date()));
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [successAppt, setSuccessAppt] = useState<{
    id: string;
    status: string;
  } | null>(null);

  const calendarWrapRef = useRef<HTMLDivElement>(null);
  const calendarPaneRef = useRef<HTMLDivElement>(null);
  const prevMonthRef = useRef(month);
  const slotsGridRef = useRef<HTMLDivElement>(null);
  const slotBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { data: doctorsData } = useQuery({
    queryKey: ["appointment-doctors"],
    queryFn: () => apiFetch<{ data: Doctor[] }>("/api/appointments/doctors"),
  });

  const { data: pendingDesk } = useQuery({
    queryKey: ["appointment-pending-counts"],
    enabled: mode === "staff",
    queryFn: () =>
      apiFetch<{ data: { urgent: number; expiringSoon: number; total: number } }>(
        "/api/appointments/pending/counts",
      ).then((r) => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["symptom-categories"],
    enabled: mode === "patient" && pendingRedFlags.length > 0 && !intakeId,
    queryFn: () =>
      apiFetch<{
        data: Array<{ id: string; name: string }>;
      }>("/api/symptom-categories"),
  });

  const generalCategoryId = categoriesData?.data.find(
    (c) => c.name === "General / Other",
  )?.id;

  const { data: mePatient } = useQuery({
    queryKey: ["me-patient"],
    enabled: mode === "patient",
    queryFn: () => apiFetch<{ id: string }>("/api/appointments/me/patient"),
  });

  useEffect(() => {
    if (mePatient?.id) setPatientId(mePatient.id);
  }, [mePatient?.id]);

  const { data: patientHits, isFetching: patientSearchFetching } = useQuery({
    queryKey: ["patient-search", patientQuery],
    enabled:
      mode === "staff" &&
      !selectedPatient &&
      patientQuery.trim().length >= 1,
    queryFn: () =>
      apiFetch<{ data: PatientHit[] }>(
        `/api/patients?q=${encodeURIComponent(patientQuery.trim())}&pageSize=8`,
      ),
  });

  const dateKey = format(selectedDay, "yyyy-MM-dd");

  const { data: slotsData, isFetching: slotsLoading } = useQuery({
    queryKey: ["slots", doctorId, dateKey],
    enabled: Boolean(doctorId),
    refetchInterval: doctorId ? 30_000 : false,
    queryFn: () =>
      apiFetch<{ data: Slot[] }>(
        `/api/appointments/slots?doctorId=${doctorId}&date=${dateKey}`,
      ),
  });

  const nowMs = Date.now();
  const slots = (slotsData?.data ?? []).map((s) => {
    const past = new Date(s.start).getTime() <= nowMs;
    if (past && s.available) {
      return { ...s, available: false, reason: "past" as const };
    }
    return s;
  });
  const availableCount = slots.filter((s) => s.available).length;
  const bookedCount = slots.filter((s) => s.reason === "booked").length;
  const pastCount = slots.filter((s) => s.reason === "past").length;

  useEffect(() => {
    const prev = prevMonthRef.current;
    const next = month;
    if (prev.getTime() === next.getTime()) return;
    const direction = next > prev ? "forward" : "back";
    const pane = calendarPaneRef.current;
    if (pane) slideStep(null, pane, direction);
    prevMonthRef.current = next;
  }, [month]);

  useEffect(() => {
    const grid = slotsGridRef.current;
    if (!grid) return;
    const cells = grid.querySelectorAll("[data-slot-chip]");
    if (cells.length) staggerCards(cells);
  }, [dateKey, doctorId, slots.length]);

  const bookMutation = useMutation({
    mutationFn: async (scheduledAt: string) => {
      let linkedIntakeId = intakeId;
      if (
        !linkedIntakeId &&
        mode === "patient" &&
        pendingRedFlags.length > 0
      ) {
        if (!generalCategoryId) {
          throw new Error("Could not resolve a default symptom category");
        }
        const complaint =
          reason.trim().length >= 10
            ? reason.trim()
            : "Patient booked after reporting emergency warning symptoms";
        const created = await apiFetch<{ data: { id: string } }>(
          "/api/patient-intake",
          {
            method: "POST",
            body: JSON.stringify({
              symptomCategoryId: generalCategoryId,
              chiefComplaintText: complaint,
              durationValue: 0,
              durationUnit: "days",
              severity: "SEVERE",
              redFlagsSelected: pendingRedFlags,
            }),
          },
        );
        linkedIntakeId = created.data.id;
      }

      return apiFetch<{ id: string; status: string }>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          doctorId,
          scheduledAt,
          reasonForVisit: reason || null,
          intakeId: linkedIntakeId || null,
          priority: pendingRedFlags.length > 0 ? "URGENT" : undefined,
        }),
      });
    },
    onSuccess: (data, scheduledAt) => {
      const btn = slotBtnRefs.current.get(scheduledAt);
      if (btn) slotConfirmPulse(btn);

      // Mark slot taken immediately so it cannot be booked twice while refetching.
      queryClient.setQueryData<{ data: Slot[] }>(
        ["slots", doctorId, dateKey],
        (prev) => {
          if (!prev?.data) return prev;
          return {
            data: prev.data.map((s) =>
              s.start === scheduledAt
                ? { ...s, available: false, reason: "booked" as const }
                : s,
            ),
          };
        },
      );

      setPendingSlot(null);
      setSelectedSlot(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["slots", doctorId, dateKey] });
      void queryClient.invalidateQueries({ queryKey: ["appointment-pending-counts"] });
      if (mode === "patient") {
        setSuccessAppt({ id: data.id, status: data.status });
        return;
      }
      toast.success("Appointment booked for this slot");
    },
    onError: (err, scheduledAt) => {
      const btn = slotBtnRefs.current.get(scheduledAt);
      if (btn) optimisticRestore(btn);
      setPendingSlot(null);
      if (err instanceof ApiError && err.status === 409) {
        const msg = err.message.toLowerCase();
        if (msg.includes("already has an open appointment") || msg.includes("patient_already")) {
          toast.error(err.message);
          setSelectedSlot(null);
          return;
        }
        toast.error("That slot was just taken — please choose another.");
        void queryClient.invalidateQueries({ queryKey: ["slots", doctorId, dateKey] });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Booking failed");
    },
  });

  const waitlistMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/appointments/waitlist", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          doctorId,
          preferredDate: dateKey,
        }),
      }),
    onSuccess: () => toast.success("Added to waitlist for this day"),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Waitlist failed"),
  });

  const doctors = (doctorsData?.data ?? []).filter((d) =>
    departmentId ? d.department.id === departmentId : true,
  );
  const canBook = Boolean(doctorId && patientId);

  const selectedPatientLabel = useMemo(() => {
    if (mode === "patient") return "You";
    if (selectedPatient) {
      return `${selectedPatient.firstName} ${selectedPatient.lastName} · ${selectedPatient.mrn}`;
    }
    return null;
  }, [mode, selectedPatient]);

  function onPatientQueryChange(value: string) {
    setPatientQuery(value);
    // Typing a new search clears a prior pick so we never keep a stale UUID selection.
    if (selectedPatient) {
      setSelectedPatient(null);
      setPatientId("");
    }
  }

  function onPickSlot(slot: Slot) {
    if (!slot.available || !canBook || pendingSlot || bookMutation.isPending) return;
    if (new Date(slot.start).getTime() <= Date.now()) {
      toast.error("That time has already passed. Choose a later slot.");
      void queryClient.invalidateQueries({ queryKey: ["slots", doctorId, dateKey] });
      return;
    }
    setSelectedSlot(slot.start);
  }

  function onConfirmBook() {
    if (!selectedSlot || !canBook || pendingSlot || bookMutation.isPending) return;
    if (new Date(selectedSlot).getTime() <= Date.now()) {
      toast.error("That time has already passed. Choose a later slot.");
      setSelectedSlot(null);
      void queryClient.invalidateQueries({ queryKey: ["slots", doctorId, dateKey] });
      return;
    }
    setPendingSlot(selectedSlot);
    bookMutation.mutate(selectedSlot);
  }

  if (successAppt) {
    return (
      <PageEnter>
        <div className="mx-auto max-w-lg space-y-6 rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Appointment request submitted
          </h1>
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-medium text-amber-800">Pending confirmation</span>
          </p>
          <p className="text-sm text-foreground">
            Your appointment request has been received. Our staff will review and
            confirm it shortly.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium">What happens next?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Reception will review your request.</li>
              <li>You&apos;ll receive a notification once it is confirmed.</li>
              <li>Track status anytime in My Appointments.</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/portal/appointments/${successAppt.id}`}>View request</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/appointments">My appointments</Link>
            </Button>
          </div>
        </div>
      </PageEnter>
    );
  }

  return (
    <PageEnter className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Book appointment
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Select a doctor, confirm the patient, then pick an open slot.
          </p>
        </div>
        {mode === "staff" && pendingDesk ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/appointments/pending"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-medium text-foreground hover:bg-muted/60"
            >
              Pending
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 tabular-nums text-primary">
                {pendingDesk.total}
              </span>
            </Link>
            <Link
              href="/appointments/queue"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-medium text-foreground hover:bg-muted/60"
            >
              Today&apos;s queue
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid w-full min-w-0 gap-3 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-stretch">
        {/* Left: booking inputs + compact calendar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="doctor">Doctor</Label>
            <select
              id="doctor"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={doctorId}
              onChange={(e) => {
                setDoctorId(e.target.value);
                setSelectedSlot(null);
              }}
            >
              <option value="">Select doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.name ?? d.user.email}
                  {d.specialization ? ` — ${d.specialization}` : ""}
                </option>
              ))}
            </select>
            {departmentId && doctors.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No doctors are assigned to this department yet.
              </p>
            ) : null}
          </div>

          {mode === "staff" ? (
            <div className="space-y-1.5">
              <Label htmlFor="patient-q">Patient</Label>
              <SearchInput
                id="patient-q"
                placeholder="Search name or MRN…"
                value={patientQuery}
                onChange={(e) => onPatientQueryChange(e.target.value)}
                isSearching={isTypeaheadBusy(patientQuery, {
                  isFetching: patientSearchFetching,
                })}
              />
              {selectedPatient ? (
                <p className="text-xs text-muted-foreground">
                  Booking for{" "}
                  <span className="font-medium text-foreground">
                    {selectedPatientLabel}
                  </span>
                </p>
              ) : null}
              {!selectedPatient && patientHits?.data?.length ? (
                <ul className="max-h-28 overflow-auto rounded-md border border-border text-sm">
                  {patientHits.data.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full px-3 py-1.5 text-left hover:bg-accent",
                          patientId === p.id && "bg-primary/10 text-primary",
                        )}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientId(p.id);
                          setPatientQuery(`${p.firstName} ${p.lastName}`);
                        }}
                      >
                        {p.firstName} {p.lastName} · {p.mrn}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!selectedPatient &&
              patientQuery.trim().length >= 1 &&
              !patientSearchFetching &&
              !(patientHits?.data?.length) ? (
                <p className="text-xs text-muted-foreground">No patients matched.</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason for visit (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </div>

          <div
            ref={calendarWrapRef}
            className="booking-calendar mt-auto overflow-hidden rounded-lg border border-border bg-background p-1.5"
          >
            <div ref={calendarPaneRef} className="flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDay}
                onSelect={(d) => {
                  if (!d) return;
                  setSelectedDay(startOfDay(d));
                  setSelectedSlot(null);
                }}
                month={month}
                onMonthChange={setMonth}
                disabled={{ before: startOfDay(new Date()) }}
                className="mx-auto text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right: doctor picker when idle, slots when doctor chosen */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm lg:min-h-[28rem]">
          {!doctorId ? (
            <>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Choose a doctor to continue
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Open slots for {format(selectedDay, "EEE, MMM d")} load after you pick someone.
                </p>
              </div>

              <ol className="grid gap-2 sm:grid-cols-3">
                {(mode === "staff"
                  ? ["Pick doctor", "Find patient", "Book a slot"]
                  : ["Pick doctor", "Pick a day", "Book a slot"]
                ).map((step, i) => (
                  <li
                    key={step}
                    className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-primary">{i + 1}.</span>{" "}
                    <span className="text-foreground">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="min-h-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Available doctors
                </p>
                {doctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No doctors available to book right now.
                  </p>
                ) : (
                  <ul className="grid max-h-[min(22rem,42vh)] gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                    {doctors.map((d) => {
                      const name = d.user.name ?? d.user.email;
                      return (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => setDoctorId(d.id)}
                            className="flex h-full w-full flex-col rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                          >
                            <span className="font-medium text-foreground">{name}</span>
                            <span className="mt-0.5 text-xs text-muted-foreground">
                              {d.specialization ?? d.designation}
                              {d.department?.name ? ` · ${d.department.name}` : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {mode === "staff" ? (
                <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Awaiting confirmation
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {pendingDesk?.total ?? "—"}
                    </p>
                    <Link
                      href="/appointments/pending"
                      className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Review pending requests
                    </Link>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Urgent pending
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {pendingDesk?.urgent ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prioritize these before routine bookings.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                  After booking, track status under My appointments. Staff will confirm the slot.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {format(selectedDay, "EEEE, MMM d")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {doctors.find((d) => d.id === doctorId)?.user.name ??
                      doctors.find((d) => d.id === doctorId)?.user.email ??
                      "Selected doctor"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {slotsLoading ? "Loading…" : `${availableCount} open`}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDoctorId("")}
                  >
                    Change doctor
                  </Button>
                </div>
              </div>

              {slots.length === 0 ? (
                <div className="space-y-3">
                  <EmptyState
                    className="border-0 bg-transparent py-6"
                    title="No clinic hours this day"
                    description="This doctor has no availability, or is on approved leave. Try another day."
                  />
                  {canBook ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => waitlistMutation.mutate()}
                      disabled={waitlistMutation.isPending}
                    >
                      Join waitlist for this day
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div
                    ref={slotsGridRef}
                    role="grid"
                    aria-label="Available time slots"
                    className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
                  >
                    {slots.map((slot) => {
                      const label = format(new Date(slot.start), "h:mm a");
                      const muted = !slot.available;
                      const isPending = pendingSlot === slot.start;
                      const isSelected = selectedSlot === slot.start && !muted;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          data-slot-chip
                          role="gridcell"
                          disabled={
                            muted ||
                            !canBook ||
                            Boolean(pendingSlot) ||
                            bookMutation.isPending
                          }
                          aria-disabled={muted || !canBook}
                          aria-pressed={isSelected}
                          aria-label={`${label}${
                            muted
                              ? `, ${
                                  slot.reason === "past"
                                    ? "already passed"
                                    : slot.reason === "booked"
                                      ? "already booked"
                                      : "unavailable"
                                }`
                              : isSelected
                                ? ", selected"
                                : ""
                          }`}
                          ref={(el) => {
                            if (el) slotBtnRefs.current.set(slot.start, el);
                            else slotBtnRefs.current.delete(slot.start);
                          }}
                          onClick={() => onPickSlot(slot)}
                          className={cn(
                            "rounded-md border px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            slot.reason === "booked"
                              ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-70"
                              : slot.reason === "past" || muted
                                ? "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground/80 opacity-50"
                                : isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/15",
                            isPending &&
                              "pointer-events-none ring-2 ring-primary/40 opacity-70",
                          )}
                        >
                          {isPending ? "Booking…" : label}
                        </button>
                      );
                    })}
                  </div>

                  {availableCount === 0 && canBook ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => waitlistMutation.mutate()}
                      disabled={waitlistMutation.isPending}
                    >
                      Day is full — join waitlist
                    </Button>
                  ) : null}
                  {!canBook ? (
                    <p className="text-sm text-muted-foreground">
                      {mode === "staff"
                        ? "Select a patient to enable booking."
                        : "Loading your patient profile…"}
                    </p>
                  ) : null}

                  <div className="mt-auto space-y-3 border-t border-border pt-3">
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm border border-primary/40 bg-primary/15" />
                        Open ({availableCount})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-muted line-through" />
                        Booked ({bookedCount})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-muted/50 opacity-60" />
                        Past ({pastCount})
                      </span>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                      <p className="font-medium text-foreground">
                        {selectedSlot
                          ? `Selected ${format(new Date(selectedSlot), "h:mm a")} on ${format(selectedDay, "MMM d")}`
                          : selectedPatientLabel
                            ? `Ready to book for ${selectedPatientLabel}`
                            : mode === "patient"
                              ? "Select a time, then confirm below"
                              : "Search and select a patient, then choose a time"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Past times are blocked. Confirm with Book appointment — each slot once.
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={
                        !selectedSlot ||
                        !canBook ||
                        Boolean(pendingSlot) ||
                        bookMutation.isPending
                      }
                      onClick={onConfirmBook}
                    >
                      {bookMutation.isPending
                        ? "Booking…"
                        : mode === "patient"
                          ? "Request appointment"
                          : "Book appointment"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageEnter>
  );
}
