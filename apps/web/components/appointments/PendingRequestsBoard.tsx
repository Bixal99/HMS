"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";

type PendingAppt = {
  id: string;
  status: string;
  priority: "LOW" | "NORMAL" | "URGENT" | "EMERGENCY";
  visitType: string;
  appointmentSource: string;
  scheduledAt: string;
  pendingExpiresAt: string | null;
  reasonForVisit: string | null;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    phone: string;
  };
  doctor: {
    id: string;
    user: { name: string | null };
    department: { name: string };
  };
  intake?: {
    isUrgent: boolean;
    chiefComplaintText?: string;
    symptomCategory?: { name: string };
  } | null;
};

const REJECT_REASONS = [
  { code: "DOCTOR_UNAVAILABLE", label: "Doctor unavailable" },
  { code: "CLINIC_CLOSED", label: "Clinic closed" },
  { code: "DUPLICATE_BOOKING", label: "Duplicate booking" },
  { code: "PATIENT_REQUESTED_CANCEL", label: "Patient requested cancellation" },
  { code: "OTHER", label: "Other" },
] as const;

function expiryTone(expiresAt: string | null) {
  if (!expiresAt) return "neutral";
  const mins = differenceInMinutes(new Date(expiresAt), new Date());
  if (mins < 30) return "attention";
  if (mins < 120) return "warning";
  return "neutral";
}

export function PendingRequestsBoard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "reschedule">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectCode, setRejectCode] = useState<string>("DOCTOR_UNAVAILABLE");
  const [rejectNote, setRejectNote] = useState("");

  const pendingQuery = useQuery({
    queryKey: ["appointments-pending"],
    queryFn: () =>
      apiFetch<{ data: PendingAppt[]; counts: { urgent: number; expiringSoon: number; total: number } }>(
        "/api/appointments/pending",
      ),
    refetchInterval: 15_000,
  });

  const rescheduleQuery = useQuery({
    queryKey: ["appointments-reschedule-requests"],
    queryFn: () => apiFetch<{ data: PendingAppt[] }>("/api/appointments/reschedule-requests"),
    enabled: tab === "reschedule",
  });

  const items = tab === "pending" ? pendingQuery.data?.data ?? [] : rescheduleQuery.data?.data ?? [];
  const selected = items.find((a) => a.id === selectedId) ?? null;

  const groups = useMemo(() => {
    const urgent: PendingAppt[] = [];
    const expiring: PendingAppt[] = [];
    const normal: PendingAppt[] = [];
    for (const a of items) {
      const isUrgent = a.priority === "URGENT" || a.priority === "EMERGENCY";
      const tone = expiryTone(a.pendingExpiresAt);
      if (isUrgent) urgent.push(a);
      else if (tone !== "neutral") expiring.push(a);
      else normal.push(a);
    }
    return { urgent, expiring, normal };
  }, [items]);

  const confirmMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/appointments/${id}/confirm`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success("Appointment confirmed");
      void qc.invalidateQueries({ queryKey: ["appointments-pending"] });
      setSelectedId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Confirm failed"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/appointments/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({
          reasonCode: rejectCode,
          reasonNote: rejectNote || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Request rejected");
      void qc.invalidateQueries({ queryKey: ["appointments-pending"] });
      setSelectedId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reject failed"),
  });

  const approveRescheduleMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/appointments/${id}/approve-reschedule`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: () => {
      toast.success("Reschedule approved");
      void qc.invalidateQueries({ queryKey: ["appointments-reschedule-requests"] });
      setSelectedId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function renderGroup(title: string, list: PendingAppt[]) {
    if (list.length === 0) return null;
    return (
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title} ({list.length})
        </h3>
        <ul className="space-y-2">
          {list.map((a) => {
            const tone = expiryTone(a.pendingExpiresAt);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                    selectedId === a.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {(a.priority === "URGENT" || a.priority === "EMERGENCY") && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                        {a.priority}
                      </span>
                    )}
                    <span className="font-medium text-foreground">
                      {a.patient.firstName} {a.patient.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.patient.mrn}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.doctor.user.name} · {a.doctor.department.name} ·{" "}
                    {new Date(a.scheduledAt).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.visitType.replaceAll("_", " ")} · Requested{" "}
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    {a.pendingExpiresAt ? (
                      <span
                        className={cn(
                          "ml-2",
                          tone === "attention" && "font-medium text-red-700",
                          tone === "warning" && "font-medium text-amber-700",
                        )}
                      >
                        · Expires {formatDistanceToNow(new Date(a.pendingExpiresAt), { addSuffix: true })}
                      </span>
                    ) : null}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <PageEnter>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pending appointment requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, confirm, reject, or offer alternatives. Urgent requests appear first.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={tab === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("pending")}
          >
            Pending requests
            {pendingQuery.data?.counts?.total ? (
              <span className="ml-2 rounded-full bg-background/20 px-1.5 text-xs">
                {pendingQuery.data.counts.total}
              </span>
            ) : null}
          </Button>
          <Button
            variant={tab === "reschedule" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("reschedule")}
          >
            Reschedule requests
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-6">
            {items.length === 0 ? (
              <EmptyState
                title="No requests"
                description={
                  tab === "pending"
                    ? "New patient portal bookings will appear here."
                    : "Patient reschedule requests will appear here."
                }
              />
            ) : (
              <>
                {renderGroup("Urgent", groups.urgent)}
                {renderGroup("Expiring soon", groups.expiring)}
                {renderGroup("Normal", groups.normal)}
              </>
            )}
          </div>

          <aside className="rounded-xl border border-border bg-card p-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a request to review details and act.</p>
            ) : (
              <div className="space-y-4">
                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Patient</h3>
                  <p className="mt-1 font-medium">
                    {selected.patient.firstName} {selected.patient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selected.patient.mrn} · {selected.patient.phone}
                  </p>
                </section>
                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Appointment</h3>
                  <p className="mt-1 text-sm">
                    {selected.doctor.user.name} · {selected.doctor.department.name}
                  </p>
                  <p className="text-sm">{new Date(selected.scheduledAt).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.appointmentSource} · {selected.visitType} · {selected.priority}
                  </p>
                  {selected.reasonForVisit ? (
                    <p className="mt-2 text-sm">{selected.reasonForVisit}</p>
                  ) : null}
                </section>
                {selected.intake ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">Intake</h3>
                    <p className="mt-1 text-sm">{selected.intake.symptomCategory?.name}</p>
                    {selected.intake.isUrgent ? (
                      <p className="text-xs font-medium text-amber-800">Marked urgent</p>
                    ) : null}
                  </section>
                ) : null}
                <section className="space-y-2 border-t border-border pt-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Actions</h3>
                  {tab === "pending" ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => confirmMut.mutate(selected.id)}
                        disabled={confirmMut.isPending}
                      >
                        Confirm
                      </Button>
                      <div className="space-y-2">
                        <Label>Reject reason</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={rejectCode}
                          onChange={(e) => setRejectCode(e.target.value)}
                        >
                          {REJECT_REASONS.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Optional note"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => rejectMut.mutate(selected.id)}
                          disabled={rejectMut.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => approveRescheduleMut.mutate(selected.id)}
                      disabled={approveRescheduleMut.isPending}
                    >
                      Approve reschedule
                    </Button>
                  )}
                </section>
              </div>
            )}
          </aside>
        </div>
      </div>
    </PageEnter>
  );
}
