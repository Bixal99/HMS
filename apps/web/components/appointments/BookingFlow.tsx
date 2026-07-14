"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import {
  optimisticRemove,
  optimisticRestore,
  slideStep,
  staggerCards,
} from "@/lib/motion";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [reason, setReason] = useState(initialReason);
  const [month, setMonth] = useState<Date>(startOfDay(new Date()));
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
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

  const { data: patientHits } = useQuery({
    queryKey: ["patient-search", patientQuery],
    enabled: mode === "staff" && patientQuery.trim().length >= 2,
    queryFn: () =>
      apiFetch<{ data: PatientHit[] }>(
        `/api/patients?q=${encodeURIComponent(patientQuery.trim())}&pageSize=8`,
      ),
  });

  const dateKey = format(selectedDay, "yyyy-MM-dd");

  const { data: slotsData, isFetching: slotsLoading } = useQuery({
    queryKey: ["slots", doctorId, dateKey],
    enabled: Boolean(doctorId),
    queryFn: () =>
      apiFetch<{ data: Slot[] }>(
        `/api/appointments/slots?doctorId=${doctorId}&date=${dateKey}`,
      ),
  });

  const slots = slotsData?.data ?? [];
  const availableCount = slots.filter((s) => s.available).length;

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
    onSuccess: (data) => {
      setPendingSlot(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["slots", doctorId, dateKey] });
      if (mode === "patient") {
        setSuccessAppt({ id: data.id, status: data.status });
        return;
      }
      toast.success("Appointment confirmed");
    },
    onError: (err, scheduledAt) => {
      const btn = slotBtnRefs.current.get(scheduledAt);
      if (btn) optimisticRestore(btn);
      setPendingSlot(null);
      if (err instanceof ApiError && err.status === 409) {
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
    const hit = patientHits?.data.find((p) => p.id === patientId);
    if (hit) return `${hit.firstName} ${hit.lastName} (${hit.mrn})`;
    return patientId || null;
  }, [mode, patientHits, patientId]);

  function onPickSlot(slot: Slot) {
    if (!slot.available || !canBook || pendingSlot) return;
    const btn = slotBtnRefs.current.get(slot.start);
    if (btn) optimisticRemove(btn);
    setPendingSlot(slot.start);
    bookMutation.mutate(slot.start);
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
    <PageEnter>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Book appointment
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a doctor and day, then choose an open slot.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doctor">Doctor</Label>
              <select
                id="doctor"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
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
                  No doctors are assigned to this department yet. Go back and
                  choose a different department if you need to book now.
                </p>
              ) : null}
            </div>

            {mode === "staff" ? (
              <div className="space-y-2">
                <Label htmlFor="patient-q">Patient</Label>
                <Input
                  id="patient-q"
                  placeholder="Search name or MRN…"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                />
                {patientHits?.data?.length ? (
                  <ul className="max-h-40 overflow-auto rounded-md border border-border text-sm">
                    {patientHits.data.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full px-3 py-2 text-left hover:bg-accent",
                            patientId === p.id && "bg-primary/10 text-primary",
                          )}
                          onClick={() => {
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
                {selectedPatientLabel && patientId ? (
                  <p className="text-xs text-muted-foreground">
                    Booking for {selectedPatientLabel}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for visit (optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
            </div>

            <div ref={calendarWrapRef} className="overflow-hidden rounded-lg border border-border bg-card p-3">
              <div ref={calendarPaneRef}>
                <DayPicker
                  mode="single"
                  selected={selectedDay}
                  onSelect={(d) => d && setSelectedDay(startOfDay(d))}
                  month={month}
                  onMonthChange={setMonth}
                  disabled={{ before: startOfDay(new Date()) }}
                  className="mx-auto"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium text-foreground">
                {format(selectedDay, "EEEE, MMM d")}
              </h2>
              {doctorId ? (
                <span className="text-xs text-muted-foreground">
                  {slotsLoading ? "Loading…" : `${availableCount} open`}
                </span>
              ) : null}
            </div>

            {!doctorId ? (
              <EmptyState
                title="Choose a doctor"
                description="Available slots appear once a doctor is selected."
              />
            ) : slots.length === 0 ? (
              <div className="space-y-3">
                <EmptyState
                  title="No clinic hours this day"
                  description="The doctor has no availability, or is on approved leave."
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
              <>
                <div
                  ref={slotsGridRef}
                  role="grid"
                  aria-label="Available time slots"
                  className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                >
                  {slots.map((slot) => {
                    const label = format(new Date(slot.start), "h:mm a");
                    const muted = !slot.available;
                    const isPending = pendingSlot === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        data-slot-chip
                        role="gridcell"
                        disabled={muted || !canBook || Boolean(pendingSlot)}
                        aria-disabled={muted || !canBook}
                        aria-label={`${label}${muted ? `, ${slot.reason ?? "unavailable"}` : ""}`}
                        ref={(el) => {
                          if (el) slotBtnRefs.current.set(slot.start, el);
                          else slotBtnRefs.current.delete(slot.start);
                        }}
                        onClick={() => onPickSlot(slot)}
                        className={cn(
                          "rounded-md border px-2 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          muted
                            ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground opacity-60"
                            : "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/15",
                          isPending && "opacity-0",
                        )}
                      >
                        {label}
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
              </>
            )}
          </div>
        </div>
      </div>
    </PageEnter>
  );
}
