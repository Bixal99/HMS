"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addHours, format, isValid, parseISO, startOfHour } from "date-fns";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { BoardSkeleton } from "@/components/shared/BoardSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { cn } from "@/lib/utils";

type SurgeryRow = {
  id: string;
  procedureName: string;
  urgency: "ELECTIVE" | "URGENT" | "EMERGENCY";
  status: "REQUESTED" | "SCHEDULED" | "COMPLETED" | "CANCELLED";
  orRoom: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  operativeNotes: string | null;
  patient: { id: string; firstName: string; lastName: string; mrn: string };
  primarySurgeon: { id: string; user: { name: string | null } } | null;
};

type Doctor = {
  id: string;
  user: { name: string | null; email: string };
};

const COLUMNS = [
  { id: "REQUESTED", label: "Requested" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "COMPLETED", label: "Completed" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

type SurgeryCard = SurgeryRow & { columnId: ColumnId };

type ScheduleForm = {
  orRoom: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  surgeonId: string;
  notes: string;
};

/** Sensible OR window: next whole hour (or 10:00 if still morning), +2h end. */
function defaultScheduleWindow(): Omit<ScheduleForm, "orRoom" | "surgeonId" | "notes"> {
  const now = new Date();
  let start = addHours(startOfHour(now), 1);
  // Prefer a clean 10:00–12:00 when that is still ahead today
  const ten = new Date(now);
  ten.setHours(10, 0, 0, 0);
  if (ten.getTime() > now.getTime()) {
    start = ten;
  }
  const end = addHours(start, 2);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
  };
}

function combineLocal(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
  if (!/^\d{2}:\d{2}$/.test(time.trim())) return null;
  const d = parseISO(`${date.trim()}T${time.trim()}:00`);
  return isValid(d) ? d : null;
}

function validateSchedule(form: ScheduleForm) {
  if (!form.orRoom.trim()) return "OR room is required";
  if (!form.surgeonId) return "Select a primary surgeon";
  if (!form.startDate || !form.startTime) {
    return "Set a full start date and time";
  }
  if (!form.endDate || !form.endTime) {
    return "Set a full end date and time";
  }
  const startAt = combineLocal(form.startDate, form.startTime);
  const endAt = combineLocal(form.endDate, form.endTime);
  if (!startAt || !endAt) return "Start and end must be valid date/times";
  if (endAt.getTime() <= startAt.getTime()) {
    return "End must be after start";
  }
  const year = startAt.getFullYear();
  const nowY = new Date().getFullYear();
  if (year < nowY - 1 || year > nowY + 2) {
    return "Use a realistic schedule year";
  }
  return null;
}

function formFromRow(row: SurgeryRow, fallbackSurgeonId?: string): ScheduleForm {
  const defaults = defaultScheduleWindow();
  const startAt = row.scheduledStart ? new Date(row.scheduledStart) : null;
  const endAt = row.scheduledEnd
    ? new Date(row.scheduledEnd)
    : startAt
      ? addHours(startAt, 2)
      : null;

  const useStart = startAt && isValid(startAt) ? startAt : null;
  const useEnd = endAt && isValid(endAt) ? endAt : null;

  return {
    orRoom: row.orRoom?.trim() || "OR-1",
    startDate: useStart ? format(useStart, "yyyy-MM-dd") : defaults.startDate,
    startTime: useStart ? format(useStart, "HH:mm") : defaults.startTime,
    endDate: useEnd ? format(useEnd, "yyyy-MM-dd") : defaults.endDate,
    endTime: useEnd ? format(useEnd, "HH:mm") : defaults.endTime,
    surgeonId: row.primarySurgeon?.id || fallbackSurgeonId || "",
    notes: "",
  };
}

export function SurgeryBoard({ role }: { role: string }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(() => ({
    orRoom: "OR-1",
    surgeonId: "",
    notes: "",
    ...defaultScheduleWindow(),
  }));
  const [operativeNotes, setOperativeNotes] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["surgery-board"],
    queryFn: () => apiFetch<{ data: SurgeryRow[] }>("/api/surgery/board"),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["appointment-doctors"],
    queryFn: () => apiFetch<{ data: Doctor[] }>("/api/appointments/doctors"),
  });

  const { data: me } = useQuery({
    queryKey: ["health-me"],
    queryFn: () => apiFetch<{ staffId?: string | null }>("/health/me"),
  });

  const doctors = doctorsData?.data ?? [];
  const preferredSurgeonId =
    (me?.staffId && doctors.some((d) => d.id === me.staffId)
      ? me.staffId
      : null) ||
    doctors[0]?.id ||
    "";

  const rows = data?.data ?? [];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  // Always load a complete date+time window when a case opens (avoids empty --:--).
  useEffect(() => {
    if (!selected) return;
    setForm(formFromRow(selected, preferredSurgeonId));
    setOperativeNotes(selected.operativeNotes ?? "");
  }, [selected?.id, preferredSurgeonId]);

  const cards: SurgeryCard[] = rows
    .filter((r) => r.status !== "CANCELLED")
    .map((r) => ({
      ...r,
      columnId: r.status as ColumnId,
    }));

  const schedule = useMutation({
    mutationFn: (input: { requestId: string; values: ScheduleForm }) => {
      const startAt = combineLocal(input.values.startDate, input.values.startTime);
      const endAt = combineLocal(input.values.endDate, input.values.endTime);
      if (!startAt || !endAt) {
        throw new Error("Invalid schedule times");
      }
      return apiFetch(`/api/surgery/requests/${input.requestId}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({
          orRoom: input.values.orRoom.trim(),
          scheduledStart: startAt.toISOString(),
          scheduledEnd: endAt.toISOString(),
          primarySurgeonId: input.values.surgeonId,
          scheduleNotes: input.values.notes || null,
        }),
      });
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["surgery-board"] });
      toast.success("Surgery scheduled", {
        action: {
          label: "Edit",
          onClick: () => setSelectedId(vars.requestId),
        },
        duration: 8_000,
      });
      if (selectedId === vars.requestId) setSelectedId(null);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Schedule failed"),
  });

  const complete = useMutation({
    mutationFn: () =>
      apiFetch(`/api/surgery/requests/${selectedId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ operativeNotes }),
      }),
    onSuccess: () => {
      toast.success("Surgery completed — billing notified");
      void queryClient.invalidateQueries({ queryKey: ["surgery-board"] });
      setSelectedId(null);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Complete failed"),
  });

  const cancel = useMutation({
    mutationFn: () =>
      apiFetch(`/api/surgery/requests/${selectedId}/cancel`, {
        method: "PATCH",
        body: "{}",
      }),
    onSuccess: () => {
      toast.success("Surgery cancelled");
      void queryClient.invalidateQueries({ queryKey: ["surgery-board"] });
      setSelectedId(null);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Cancel failed"),
  });

  function openCase(row: SurgeryRow) {
    setSelectedId(row.id);
  }

  function applySuggestedTimes() {
    const defaults = defaultScheduleWindow();
    setForm((prev) => ({
      ...prev,
      ...defaults,
      orRoom: prev.orRoom.trim() || "OR-1",
      surgeonId: prev.surgeonId || preferredSurgeonId,
    }));
    toast.message("Filled suggested start and end times");
  }

  function quickSchedule(row: SurgeryRow) {
    const values = formFromRow(row, preferredSurgeonId);
    const problem = validateSchedule(values);
    if (problem) {
      openCase(row);
      toast.message(`${problem} — finish details, then Schedule`);
      return;
    }
    const startAt = combineLocal(values.startDate, values.startTime)!;
    toast.message(
      `Scheduling ${format(startAt, "MMM d, h:mm a")} · ${values.orRoom}…`,
    );
    schedule.mutate({ requestId: row.id, values });
  }

  function onMove(id: string, to: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (to === row.status) return;

    if (to === "SCHEDULED") {
      if (!["ADMIN", "DOCTOR"].includes(role)) {
        toast.message("Only doctors or admins can schedule OT cases");
        openCase(row);
        return;
      }
      // Smart drag: schedule with defaults immediately; Edit from the toast if needed.
      if (row.status === "REQUESTED") {
        quickSchedule(row);
        return;
      }
      openCase(row);
      return;
    }

    if (to === "COMPLETED") {
      if (row.status !== "SCHEDULED") {
        toast.error("Schedule the case before completing it");
        return;
      }
      openCase(row);
      if (!["ADMIN", "DOCTOR"].includes(role)) {
        toast.message("Only doctors or admins can complete OT cases");
      } else {
        toast.message("Add operative notes to complete");
      }
      return;
    }

    if (to === "REQUESTED") {
      toast.message("Open the card to cancel or adjust the case");
      openCase(row);
    }
  }

  function onScheduleClick() {
    let next = form;
    // Auto-heal incomplete times so Schedule is never blocked by --:--.
    if (
      !next.startDate ||
      !next.startTime ||
      !next.endDate ||
      !next.endTime ||
      !combineLocal(next.startDate, next.startTime) ||
      !combineLocal(next.endDate, next.endTime)
    ) {
      const defaults = defaultScheduleWindow();
      next = {
        ...next,
        ...defaults,
        orRoom: next.orRoom.trim() || "OR-1",
        surgeonId: next.surgeonId || preferredSurgeonId,
      };
      setForm(next);
      toast.message("Filled missing times with a suggested window — click Schedule again to confirm");
      return;
    }

    const problem = validateSchedule(next);
    if (problem) {
      toast.error(problem);
      return;
    }
    if (!selectedId) return;
    schedule.mutate({ requestId: selectedId, values: next });
  }

  return (
    <PageEnter>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Surgery board
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag Requested → Scheduled to auto-book with defaults (toast has Edit).
            Completing still needs operative notes. Click a card anytime to edit.
          </p>
        </div>

        {isLoading ? (
          <BoardSkeleton columns={4} label="Loading surgery board…" />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : cards.length === 0 ? (
          <EmptyState
            title="No surgery requests"
            description="Doctors can recommend surgery from a consultation."
          />
        ) : (
          <KanbanBoard
            columns={[...COLUMNS]}
            items={cards}
            onMove={onMove}
            onCardOpen={(item) => openCase(item)}
            renderCard={(r, { open }) => (
              <button
                type="button"
                className="w-full text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
              >
                <p className="font-medium text-foreground">
                  {r.patient.firstName} {r.patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{r.patient.mrn}</p>
                <p className="mt-1 text-sm text-foreground">{r.procedureName}</p>
                <p
                  className={cn(
                    "mt-2 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                    r.urgency === "ELECTIVE" && "bg-muted text-muted-foreground",
                    r.urgency === "URGENT" && "bg-amber-100 text-amber-900",
                    r.urgency === "EMERGENCY" && "bg-destructive/15 text-destructive",
                  )}
                >
                  {r.urgency}
                </p>
                {r.scheduledStart ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {format(new Date(r.scheduledStart), "MMM d, h:mm a")}
                    {r.orRoom ? ` · ${r.orRoom}` : ""}
                  </p>
                ) : null}
              </button>
            )}
            renderOverlay={(r) => (
              <div className="w-72 rotate-1 rounded-lg border border-primary/40 bg-card p-3 shadow-xl">
                <p className="font-medium">
                  {r.patient.firstName} {r.patient.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{r.procedureName}</p>
              </div>
            )}
          />
        )}
      </div>

      <ActionDrawer
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelectedId(null)}
        title={
          selected
            ? `${selected.patient.firstName} ${selected.patient.lastName}`
            : "Surgery"
        }
        description={
          selected
            ? `${selected.procedureName} · ${selected.urgency} · ${selected.status}`
            : undefined
        }
        widthClass="w-[min(32rem,94vw)]"
        footer={
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setSelectedId(null)}
          >
            Close
          </Button>
        }
      >
        {selected ? (
          <>
            {["ADMIN", "DOCTOR"].includes(role) &&
            (selected.status === "REQUESTED" || selected.status === "SCHEDULED") ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="or-room">OR room</Label>
                  <Input
                    id="or-room"
                    value={form.orRoom}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, orRoom: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="surg-start-date">Start date</Label>
                    <Input
                      id="surg-start-date"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => {
                        const startDate = e.target.value;
                        setForm((prev) => {
                          const startAt = combineLocal(startDate, prev.startTime);
                          let endDate = prev.endDate;
                          let endTime = prev.endTime;
                          if (startAt) {
                            const endAt = combineLocal(prev.endDate, prev.endTime);
                            if (!endAt || endAt.getTime() <= startAt.getTime()) {
                              const nextEnd = addHours(startAt, 2);
                              endDate = format(nextEnd, "yyyy-MM-dd");
                              endTime = format(nextEnd, "HH:mm");
                            }
                          }
                          return { ...prev, startDate, endDate, endTime };
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="surg-start-time">Start time</Label>
                    <Input
                      id="surg-start-time"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => {
                        const startTime = e.target.value;
                        setForm((prev) => {
                          const startAt = combineLocal(prev.startDate, startTime);
                          let endDate = prev.endDate;
                          let endTime = prev.endTime;
                          if (startAt) {
                            const endAt = combineLocal(prev.endDate, prev.endTime);
                            if (!endAt || endAt.getTime() <= startAt.getTime()) {
                              const nextEnd = addHours(startAt, 2);
                              endDate = format(nextEnd, "yyyy-MM-dd");
                              endTime = format(nextEnd, "HH:mm");
                            }
                          }
                          return { ...prev, startTime, endDate, endTime };
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="surg-end-date">End date</Label>
                    <Input
                      id="surg-end-date"
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="surg-end-time">End time</Label>
                    <Input
                      id="surg-end-time"
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, endTime: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={applySuggestedTimes}
                  >
                    Use suggested times
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Example: today 10:00 → 12:00. Both date and time are required.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="surgeon">Primary surgeon</Label>
                  <select
                    id="surgeon"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.surgeonId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, surgeonId: e.target.value }))
                    }
                  >
                    <option value="">Select…</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user.name ?? d.user.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sched-notes">Schedule notes</Label>
                  <Input
                    id="sched-notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={onScheduleClick}
                  disabled={schedule.isPending}
                >
                  {schedule.isPending
                    ? "Scheduling…"
                    : selected.status === "SCHEDULED"
                      ? "Update schedule"
                      : "Schedule"}
                </Button>
              </div>
            ) : null}

            {role === "RECEPTIONIST" && selected.scheduledStart ? (
              <p className="text-sm text-muted-foreground">
                Scheduled {format(new Date(selected.scheduledStart), "MMM d, h:mm a")}
                {selected.orRoom ? ` · ${selected.orRoom}` : ""}
                {selected.primarySurgeon?.user?.name
                  ? ` · ${selected.primarySurgeon.user.name}`
                  : ""}
              </p>
            ) : null}

            {selected.status === "SCHEDULED" && ["ADMIN", "DOCTOR"].includes(role) ? (
              <div className="space-y-2">
                <Label htmlFor="op-notes">Operative notes</Label>
                <textarea
                  id="op-notes"
                  className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={operativeNotes}
                  onChange={(e) => setOperativeNotes(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!operativeNotes.trim()) {
                      toast.error("Operative notes required");
                      return;
                    }
                    complete.mutate();
                  }}
                  disabled={complete.isPending}
                >
                  Mark completed
                </Button>
              </div>
            ) : null}

            {selected.status === "COMPLETED" && selected.operativeNotes ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">Operative notes</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {selected.operativeNotes}
                </p>
              </div>
            ) : null}

            {selected.status !== "COMPLETED" &&
            selected.status !== "CANCELLED" &&
            ["ADMIN", "DOCTOR"].includes(role) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                Cancel request
              </Button>
            ) : null}
          </>
        ) : null}
      </ActionDrawer>
    </PageEnter>
  );
}
