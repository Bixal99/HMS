"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageEnter } from "@/components/shared/PageEnter";
import { InlineLoader } from "@/components/shared/InlineLoader";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { Button } from "@/components/ui/button";

type Event = {
  id: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
};

type Detail = {
  id: string;
  status: string;
  priority: string;
  appointmentSource: string;
  visitType: string;
  reasonForVisit: string | null;
  scheduledAt: string;
  rejectionReason: string | null;
  doctor: {
    user: { name: string | null };
    department: { name: string };
  };
  events: Event[];
};

const TIMELINE_STEPS = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
] as const;

export function PatientAppointmentDetail() {
  const params = useParams();
  const id = String(params.id);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => apiFetch<Detail>(`/api/appointments/${id}`),
  });

  const cancelMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/appointments/${id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ cancelReason: "Cancelled by patient" }),
      }),
    onSuccess: () => {
      toast.success("Appointment cancelled");
      void qc.invalidateQueries({ queryKey: ["appointment", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Cancel failed"),
  });

  const a = q.data;
  if (q.isLoading) {
    return (
      <PageEnter>
        <InlineLoader label="Loading appointment…" />
      </PageEnter>
    );
  }
  if (q.isError || !a) {
    return (
      <PageEnter>
        <QueryErrorState
          error={q.error ?? new Error("Appointment not found")}
          onRetry={() => void q.refetch()}
          title="Couldn’t load appointment"
        />
      </PageEnter>
    );
  }

  const statusIdx = TIMELINE_STEPS.indexOf(
    a.status as (typeof TIMELINE_STEPS)[number],
  );

  return (
    <PageEnter>
      <div className="mx-auto max-w-2xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/portal/appointments">← My appointments</Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {a.doctor.user.name} · {a.doctor.department.name}
          </p>
        </div>

        <dl className="grid gap-2 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">When</dt>
            <dd>{new Date(a.scheduledAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{a.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Priority</dt>
            <dd>{a.priority}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd>{a.appointmentSource}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Reason</dt>
            <dd>{a.reasonForVisit ?? "—"}</dd>
          </div>
          {a.rejectionReason ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Rejection reason</dt>
              <dd>{a.rejectionReason}</dd>
            </div>
          ) : null}
        </dl>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Timeline</h2>
          <ol className="mt-4 space-y-3">
            {TIMELINE_STEPS.map((step, i) => {
              const done = statusIdx >= 0 && i <= statusIdx;
              const current = a.status === step;
              const event = a.events.find((e) => e.toStatus === step);
              return (
                <li key={step} className="flex gap-3 text-sm">
                  <span
                    className={
                      done
                        ? "mt-0.5 size-2.5 shrink-0 rounded-full bg-primary"
                        : "mt-0.5 size-2.5 shrink-0 rounded-full bg-muted"
                    }
                  />
                  <div>
                    <p className={current ? "font-medium" : "text-muted-foreground"}>
                      {step.replaceAll("_", " ")}
                    </p>
                    {event ? (
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {a.events.length > 0 ? (
            <ul className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              {a.events.map((e) => (
                <li key={e.id}>
                  {e.eventType} · {new Date(e.createdAt).toLocaleString()}
                  {e.note ? ` — ${e.note}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {["PENDING", "CONFIRMED"].includes(a.status) ? (
          <Button
            variant="outline"
            onClick={() => cancelMut.mutate()}
            disabled={cancelMut.isPending}
          >
            Cancel appointment
          </Button>
        ) : null}
      </div>
    </PageEnter>
  );
}
