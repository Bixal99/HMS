"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { WelcomeBackBanner } from "@/components/dashboard/WelcomeBackBanner";
import { PageEnter } from "@/components/shared/PageEnter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Appt = {
  id: string;
  status: string;
  priority: string;
  scheduledAt: string;
  reasonForVisit: string | null;
  doctor: {
    user: { name: string | null };
    department: { name: string };
  };
};

function nextCopy(a: Appt) {
  if (a.status === "PENDING") return "Waiting for confirmation";
  if (a.status === "CONFIRMED") {
    const hours = (new Date(a.scheduledAt).getTime() - Date.now()) / 36e5;
    if (hours > 0 && hours < 24) return `Starts in ${Math.round(hours)} hours — arrive 15 minutes early`;
    return "Arrive 15 minutes early";
  }
  return a.status.replaceAll("_", " ");
}

export function PatientPortalHome() {
  const appointmentsQ = useQuery({
    queryKey: ["appointments-mine"],
    queryFn: () => apiFetch<{ data: Appt[] }>("/api/appointments/mine?filter=upcoming"),
  });
  const pendingQ = useQuery({
    queryKey: ["appointments-mine-pending"],
    queryFn: () => apiFetch<{ data: Appt[] }>("/api/appointments/mine?filter=pending"),
  });
  const notifQ = useQuery({
    queryKey: ["notifications-preview"],
    queryFn: () =>
      apiFetch<{ items: Array<{ id: string; title: string; href: string | null; createdAt: string }> }>(
        "/api/notifications?limit=3",
      ),
  });
  const meQ = useQuery({
    queryKey: ["patient-me-summary"],
    queryFn: () =>
      apiFetch<{
        id: string;
        mrn: string;
        bloodGroup: string;
        allergies: Array<{ allergen: string }>;
      }>("/api/patients/me").catch(() => null),
  });

  const next =
    pendingQ.data?.data?.[0] ??
    appointmentsQ.data?.data?.[0] ??
    null;

  return (
    <PageEnter>
      <div className="space-y-8">
        <WelcomeBackBanner />

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Next appointment
          </h2>
          {next ? (
            <div className="mt-3 space-y-2">
              <p className="text-lg font-medium">
                {next.doctor.user.name} · {next.doctor.department.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(next.scheduledAt).toLocaleString()}
              </p>
              <p
                className={cn(
                  "text-sm font-medium",
                  next.status === "PENDING" ? "text-amber-800" : "text-primary",
                )}
              >
                {nextCopy(next)}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/portal/appointments/${next.id}`}>View details</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                You don&apos;t have any upcoming appointments.
              </p>
              <Button asChild>
                <Link href="/appointments/book">Book appointment</Link>
              </Button>
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Notifications
            </h2>
            <ul className="mt-3 space-y-2">
              {(notifQ.data?.items ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">No recent notifications.</li>
              ) : (
                (notifQ.data?.items ?? []).map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.href ?? "/portal"}
                      className="text-sm text-foreground hover:underline"
                    >
                      {n.title}
                    </Link>
                  </li>
                ))
              )}
            </ul>
            <Button asChild variant="link" className="mt-2 h-auto p-0 text-xs">
              <Link href="/notifications">View all history</Link>
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Health summary
            </h2>
            {meQ.data ? (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Patient ID</dt>
                  <dd>{meQ.data.mrn}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Blood group</dt>
                  <dd>{meQ.data.bloodGroup}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Allergies</dt>
                  <dd>
                    {meQ.data.allergies?.length
                      ? meQ.data.allergies.map((a) => a.allergen).join(", ")
                      : "None on file"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Profile details unavailable.</p>
            )}
          </section>
        </div>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Quick actions
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/appointments/book">Book appointment</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/appointments">View appointments</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/prescriptions">Latest prescription</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/bills">Pay bills</Link>
            </Button>
          </div>
        </section>
      </div>
    </PageEnter>
  );
}
