"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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

function openRow(
  r: SurgeryRow,
  setters: {
    setSelectedId: (id: string) => void;
    setOrRoom: (v: string) => void;
    setSurgeonId: (v: string) => void;
    setNotes: (v: string) => void;
    setOperativeNotes: (v: string) => void;
    setStart: (v: string) => void;
    setEnd: (v: string) => void;
  },
) {
  setters.setSelectedId(r.id);
  setters.setOrRoom(r.orRoom ?? "OR-1");
  setters.setSurgeonId(r.primarySurgeon?.id ?? "");
  setters.setNotes("");
  setters.setOperativeNotes(r.operativeNotes ?? "");
  setters.setStart(
    r.scheduledStart
      ? format(new Date(r.scheduledStart), "yyyy-MM-dd'T'HH:mm")
      : "",
  );
  setters.setEnd(
    r.scheduledEnd ? format(new Date(r.scheduledEnd), "yyyy-MM-dd'T'HH:mm") : "",
  );
}

export function SurgeryBoard({ role }: { role: string }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orRoom, setOrRoom] = useState("OR-1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [surgeonId, setSurgeonId] = useState("");
  const [notes, setNotes] = useState("");
  const [operativeNotes, setOperativeNotes] = useState("");

  const setters = {
    setSelectedId,
    setOrRoom,
    setSurgeonId,
    setNotes,
    setOperativeNotes,
    setStart,
    setEnd,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["surgery-board"],
    queryFn: () => apiFetch<{ data: SurgeryRow[] }>("/api/surgery/board"),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["appointment-doctors"],
    queryFn: () => apiFetch<{ data: Doctor[] }>("/api/appointments/doctors"),
  });

  const rows = data?.data ?? [];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const cards: SurgeryCard[] = rows
    .filter((r) => r.status !== "CANCELLED")
    .map((r) => ({
      ...r,
      columnId: r.status as ColumnId,
    }));

  const schedule = useMutation({
    mutationFn: () =>
      apiFetch(`/api/surgery/requests/${selectedId}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({
          orRoom,
          scheduledStart: new Date(start).toISOString(),
          scheduledEnd: new Date(end).toISOString(),
          primarySurgeonId: surgeonId,
          scheduleNotes: notes || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Surgery scheduled");
      void queryClient.invalidateQueries({ queryKey: ["surgery-board"] });
      setSelectedId(null);
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

  function onMove(id: string, to: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (to === row.status) return;

    if (to === "SCHEDULED") {
      openRow(row, setters);
      if (!["ADMIN", "DOCTOR"].includes(role)) {
        toast.message("Only doctors or admins can schedule OT cases");
      } else {
        toast.message("Fill schedule details to move into Scheduled");
      }
      return;
    }

    if (to === "COMPLETED") {
      if (row.status !== "SCHEDULED") {
        toast.error("Schedule the case before completing it");
        return;
      }
      openRow(row, setters);
      if (!["ADMIN", "DOCTOR"].includes(role)) {
        toast.message("Only doctors or admins can complete OT cases");
      } else {
        toast.message("Add operative notes to complete");
      }
      return;
    }

    if (to === "REQUESTED") {
      toast.message("Open the card to cancel or adjust the case");
      openRow(row, setters);
    }
  }

  return (
    <PageEnter>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Surgery board
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag cases across stages. Scheduling and completion open the detail
            drawer.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
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
            onCardOpen={(item) => openRow(item, setters)}
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

      <Drawer open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DrawerContent className="max-h-[90vh] w-[min(32rem,94vw)]">
          <DrawerHeader>
            <DrawerTitle>
              {selected
                ? `${selected.patient.firstName} ${selected.patient.lastName}`
                : "Surgery"}
            </DrawerTitle>
          </DrawerHeader>
          {selected ? (
            <div className="space-y-4 overflow-y-auto px-4 pb-8">
              <p className="text-sm text-muted-foreground">
                {selected.procedureName} · {selected.urgency} · {selected.status}
              </p>

              {["ADMIN", "DOCTOR"].includes(role) &&
              (selected.status === "REQUESTED" || selected.status === "SCHEDULED") ? (
                <div className="space-y-2">
                  <Label htmlFor="or-room">OR room</Label>
                  <Input
                    id="or-room"
                    value={orRoom}
                    onChange={(e) => setOrRoom(e.target.value)}
                  />
                  <Label htmlFor="surg-start">Start</Label>
                  <Input
                    id="surg-start"
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                  <Label htmlFor="surg-end">End</Label>
                  <Input
                    id="surg-end"
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                  <Label htmlFor="surgeon">Primary surgeon</Label>
                  <select
                    id="surgeon"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={surgeonId}
                    onChange={(e) => setSurgeonId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(doctorsData?.data ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user.name ?? d.user.email}
                      </option>
                    ))}
                  </select>
                  <Label htmlFor="sched-notes">Schedule notes</Label>
                  <Input
                    id="sched-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!start || !end || !surgeonId || !orRoom) {
                        toast.error("Room, times, and surgeon required");
                        return;
                      }
                      schedule.mutate();
                    }}
                    disabled={schedule.isPending}
                  >
                    {selected.status === "SCHEDULED" ? "Update schedule" : "Schedule"}
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
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </PageEnter>
  );
}
