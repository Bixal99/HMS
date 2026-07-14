"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { apiFetch, API_BASE, ApiError } from "@/lib/api";
import { crossFade, staggerCards } from "@/lib/motion";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type QueueAppointment = {
  id: string;
  doctorId: string;
  patientId: string;
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "REJECTED" | "EXPIRED" | "NO_SHOW";
  reasonForVisit: string | null;
  isWalkIn?: boolean;
  queueNumber?: number | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    phone: string;
  };
  encounter?: { id: string; status: string } | null;
  intake?: {
    id: string;
    isUrgent: boolean;
    symptomCategoryId: string;
    symptomCategory: { id: string; name: string };
  } | null;
};

type Doctor = {
  id: string;
  user: { name: string | null; email: string };
};

type PatientHit = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
};

const STATUS_ORDER = ["WAITING", "CHECKED_IN", "IN_CONSULTATION", "CONFIRMED", "COMPLETED"] as const;

const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  WAITING: "Waiting",
  CHECKED_IN: "Checked in",
  IN_CONSULTATION: "In consultation",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
};

type TodayQueueProps = {
  role: string;
  /** Pre-resolved staff id for doctors (self). */
  selfStaffId?: string | null;
};

export function TodayQueue({ role, selfStaffId }: TodayQueueProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState(selfStaffId ?? "");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [patientQ, setPatientQ] = useState("");
  const [walkInPatientId, setWalkInPatientId] = useState("");
  const [walkInReason, setWalkInReason] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevStatus = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (selfStaffId) setDoctorId(selfStaffId);
  }, [selfStaffId]);

  const { data: doctorsData } = useQuery({
    queryKey: ["appointment-doctors"],
    enabled: role === "NURSE" || role === "ADMIN" || role === "RECEPTIONIST",
    queryFn: () => apiFetch<{ data: Doctor[] }>("/api/appointments/doctors"),
  });

  const { data: meStaff } = useQuery({
    queryKey: ["staff-me"],
    enabled: role === "DOCTOR" && !selfStaffId,
    queryFn: () => apiFetch<{ id: string }>("/api/staff/me"),
  });

  useEffect(() => {
    if (meStaff?.id) setDoctorId(meStaff.id);
  }, [meStaff?.id]);

  const queueKey = ["queue", doctorId] as const;

  const { data, isLoading } = useQuery({
    queryKey: queueKey,
    enabled: Boolean(doctorId),
    queryFn: () =>
      apiFetch<{ data: QueueAppointment[] }>(`/api/appointments/queue/${doctorId}`),
  });

  const appointments = data?.data ?? [];

  useEffect(() => {
    if (!doctorId) return;

    const socket: Socket = io(API_BASE, { withCredentials: true });

    const patchCache = (
      event: string,
      appointment: QueueAppointment,
    ) => {
      if (appointment.doctorId !== doctorId) return;

      queryClient.setQueryData<{ data: QueueAppointment[] }>(queueKey, (prev) => {
        const list = prev?.data ? [...prev.data] : [];
        const idx = list.findIndex((a) => a.id === appointment.id);

        if (event === "appointment:cancelled") {
          if (idx >= 0) list.splice(idx, 1);
          return { data: list };
        }

        if (idx >= 0) {
          list[idx] = { ...list[idx], ...appointment };
        } else if (event === "appointment:created" || event === "appointment:checked_in") {
          list.push(appointment);
          list.sort(
            (a, b) =>
              new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
          );
        }
        return { data: list };
      });
    };

    for (const event of [
      "appointment:created",
      "appointment:checked_in",
      "appointment:cancelled",
      "appointment:completed",
      "appointment:no_show",
    ] as const) {
      socket.on(event, (payload: QueueAppointment) => patchCache(event, payload));
    }

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queueKey identity via doctorId
  }, [doctorId, queryClient]);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const rows = root.querySelectorAll<HTMLElement>("[data-queue-row]");
    if (rows.length) staggerCards(rows);
  }, [doctorId]);

  useEffect(() => {
    for (const appt of appointments) {
      const prev = prevStatus.current.get(appt.id);
      const el = rowRefs.current.get(appt.id);
      if (prev && prev !== appt.status && el) {
        crossFade(null, el);
      }
      prevStatus.current.set(appt.id, appt.status);
    }
  }, [appointments]);

  const grouped = useMemo(() => {
    const map = new Map<string, QueueAppointment[]>();
    for (const status of STATUS_ORDER) map.set(status, []);
    for (const a of appointments) {
      if (!map.has(a.status)) continue;
      map.get(a.status)!.push(a);
    }
    for (const [, rows] of map) {
      rows.sort((a, b) => {
        const urgentDiff =
          Number(Boolean(b.intake?.isUrgent)) - Number(Boolean(a.intake?.isUrgent));
        if (urgentDiff !== 0) return urgentDiff;
        return (
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
      });
    }
    return map;
  }, [appointments]);

  const checkIn = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/appointments/${id}/check-in`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CHECKED_IN" }),
      }),
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Check-in failed"),
  });

  const complete = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/appointments/${id}/complete`, { method: "PATCH", body: "{}" }),
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Complete failed"),
  });

  const startEncounter = useMutation({
    mutationFn: (appointmentId: string) =>
      apiFetch<{ id: string }>("/api/encounters", {
        method: "POST",
        body: JSON.stringify({ appointmentId }),
      }),
    onSuccess: (encounter) => {
      void queryClient.invalidateQueries({ queryKey: queueKey });
      router.push(`/encounters/${encounter.id}`);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not start encounter"),
  });

  const canCheckIn = ["NURSE", "RECEPTIONIST", "ADMIN"].includes(role);
  const canComplete = ["DOCTOR", "ADMIN"].includes(role);
  const canStartVisit = role === "DOCTOR";
  const pickDoctor = ["NURSE", "ADMIN", "RECEPTIONIST"].includes(role);
  const canWalkIn = ["RECEPTIONIST", "ADMIN"].includes(role);

  const { data: patientHits } = useQuery({
    queryKey: ["walk-in-patients", patientQ],
    enabled: canWalkIn && walkInOpen && patientQ.trim().length >= 2,
    queryFn: () =>
      apiFetch<{ data: PatientHit[] }>(
        `/api/patients?q=${encodeURIComponent(patientQ.trim())}&pageSize=8`,
      ),
  });

  const walkIn = useMutation({
    mutationFn: () =>
      apiFetch("/api/appointments/walk-in", {
        method: "POST",
        body: JSON.stringify({
          patientId: walkInPatientId,
          doctorId,
          reasonForVisit: walkInReason || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Walk-in token issued — patient checked in");
      setWalkInOpen(false);
      setWalkInPatientId("");
      setPatientQ("");
      setWalkInReason("");
      void queryClient.invalidateQueries({ queryKey: queueKey });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Walk-in failed"),
  });

  return (
    <PageEnter>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Today&apos;s queue
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live updates — no refresh needed.
            </p>
          </div>
          {canWalkIn ? (
            <Button
              type="button"
              variant="outline"
              disabled={!doctorId}
              onClick={() => setWalkInOpen((v) => !v)}
            >
              Walk-in token
            </Button>
          ) : null}
        </div>

        {pickDoctor ? (
          <div className="space-y-2">
            <Label htmlFor="queue-doctor">Doctor</Label>
            <select
              id="queue-doctor"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Select doctor…</option>
              {(doctorsData?.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.name ?? d.user.email}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {canWalkIn && walkInOpen && doctorId ? (
          <form
            className="space-y-3 rounded-lg border border-border bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!walkInPatientId) {
                toast.error("Select a patient");
                return;
              }
              walkIn.mutate();
            }}
          >
            <p className="text-sm font-medium text-foreground">Issue walk-in token</p>
            <div className="space-y-2">
              <Label htmlFor="walk-in-patient-q">Patient search</Label>
              <input
                id="walk-in-patient-q"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={patientQ}
                onChange={(e) => {
                  setPatientQ(e.target.value);
                  setWalkInPatientId("");
                }}
                placeholder="Name or MRN…"
              />
              {(patientHits?.data ?? []).length > 0 ? (
                <ul className="max-h-36 overflow-auto rounded-md border border-border text-sm">
                  {patientHits!.data.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full px-2 py-1.5 text-left hover:bg-accent",
                          walkInPatientId === p.id && "bg-primary/10 text-primary",
                        )}
                        onClick={() => {
                          setWalkInPatientId(p.id);
                          setPatientQ(`${p.firstName} ${p.lastName} · ${p.mrn}`);
                        }}
                      >
                        {p.firstName} {p.lastName} · {p.mrn}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="walk-in-reason">Reason (optional)</Label>
              <input
                id="walk-in-reason"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={walkInReason}
                onChange={(e) => setWalkInReason(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={walkIn.isPending || !walkInPatientId}>
              Create token &amp; check in
            </Button>
          </form>
        ) : null}

        {!doctorId ? (
          <EmptyState title="Select a doctor" description="Queue loads for one clinic list at a time." />
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading queue…</p>
        ) : appointments.length === 0 ? (
          <EmptyState title="No patients yet" description="New bookings appear here instantly." />
        ) : (
          <div ref={listRef} className="space-y-6">
            {STATUS_ORDER.map((status) => {
              const rows = grouped.get(status) ?? [];
              if (rows.length === 0) return null;
              return (
                <section key={status} className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {STATUS_LABEL[status]}
                  </h2>
                  <ul className="space-y-2">
                    {rows.map((appt) => (
                      <li key={appt.id}>
                        <div
                          data-queue-row
                          ref={(el) => {
                            if (el) rowRefs.current.set(appt.id, el);
                            else rowRefs.current.delete(appt.id);
                          }}
                          className={cn(
                            "flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
                            appt.intake?.isUrgent
                              ? "border-destructive/60"
                              : "border-border",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 text-base font-medium text-foreground">
                              {appt.queueNumber != null ? (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                                  #{appt.queueNumber}
                                </span>
                              ) : null}
                              <span>
                                {appt.patient.firstName} {appt.patient.lastName}
                              </span>
                              {appt.isWalkIn ? (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Walk-in
                                </span>
                              ) : null}
                              {appt.intake?.isUrgent ? (
                                <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive-foreground">
                                  Urgent
                                </span>
                              ) : null}
                              {appt.intake?.symptomCategory?.name ? (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {appt.intake.symptomCategory.name}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(appt.scheduledAt), "h:mm a")} ·{" "}
                              {appt.patient.mrn}
                              {role === "RECEPTIONIST"
                                ? null
                                : appt.reasonForVisit
                                  ? ` · ${appt.reasonForVisit}`
                                  : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {canCheckIn && appt.status === "CONFIRMED" ? (
                              <Button
                                type="button"
                                size="lg"
                                className="min-h-11 min-w-[7rem]"
                                onClick={() => checkIn.mutate(appt.id)}
                                disabled={checkIn.isPending}
                              >
                                Check in
                              </Button>
                            ) : null}
                            {canStartVisit &&
                            ["CHECKED_IN", "WAITING", "IN_CONSULTATION"].includes(appt.status) ? (
                              <Button
                                type="button"
                                size="lg"
                                className="min-h-11 min-w-[7rem]"
                                onClick={() => {
                                  if (appt.encounter?.id) {
                                    router.push(`/encounters/${appt.encounter.id}`);
                                  } else {
                                    startEncounter.mutate(appt.id);
                                  }
                                }}
                                disabled={startEncounter.isPending}
                              >
                                {appt.encounter?.id ? "Open visit" : "Start visit"}
                              </Button>
                            ) : null}
                            {role === "NURSE" && appt.encounter?.id ? (
                              <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                className="min-h-11 min-w-[7rem]"
                                onClick={() => router.push(`/encounters/${appt.encounter!.id}`)}
                              >
                                Vitals
                              </Button>
                            ) : null}
                            {canComplete &&
                            ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"].includes(appt.status) ? (
                              <Button
                                type="button"
                                size="lg"
                                variant="secondary"
                                className="min-h-11 min-w-[7rem]"
                                onClick={() => complete.mutate(appt.id)}
                                disabled={complete.isPending}
                              >
                                Complete
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </PageEnter>
  );
}
