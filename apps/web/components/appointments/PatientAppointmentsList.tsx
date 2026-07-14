"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageEnter } from "@/components/shared/PageEnter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Appt = {
  id: string;
  status: string;
  priority: string;
  scheduledAt: string;
  doctor: { user: { name: string | null }; department: { name: string } };
};

const FILTERS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "Pending" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export function PatientAppointmentsList() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("upcoming");
  const q = useQuery({
    queryKey: ["appointments-mine", filter],
    queryFn: () =>
      apiFetch<{ data: Appt[] }>(`/api/appointments/mine?filter=${filter}`),
  });

  return (
    <PageEnter>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My appointments</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track requests, confirmations, and past visits.
            </p>
          </div>
          <Button asChild>
            <Link href="/appointments/book">Book appointment</Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {(q.data?.data ?? []).length === 0 ? (
            <li className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                You don&apos;t have any {filter} appointments.
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/appointments/book">Book appointment</Link>
              </Button>
            </li>
          ) : (
            (q.data?.data ?? []).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/portal/appointments/${a.id}`}
                  className="block rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.doctor.user.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {a.status}
                    </span>
                    {(a.priority === "URGENT" || a.priority === "EMERGENCY") && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                        {a.priority}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.doctor.department.name} · {new Date(a.scheduledAt).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </PageEnter>
  );
}
