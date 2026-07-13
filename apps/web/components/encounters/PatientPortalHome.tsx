"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { PatientInvoices } from "@/components/billing/PatientInvoices";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VisitRow = {
  id: string;
  encounterDate: string;
  status: string;
  chiefComplaint: string | null;
  doctor: { designation: string; user: { name: string | null } };
};

export function PatientPortalHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-encounters"],
    queryFn: () => apiFetch<{ data: VisitRow[] }>("/api/encounters/mine"),
  });

  const visits = data?.data ?? [];

  return (
    <PageEnter>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Patient portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Book visits and review finalized encounter summaries.</p>
            <Button asChild>
              <Link href="/appointments/book">Book an appointment</Link>
            </Button>
          </CardContent>
        </Card>

        <PatientInvoices />

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Your visits</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : visits.length === 0 ? (
            <EmptyState
              title="No visits yet"
              description="After a consultation is finalized, it will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {visits.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {format(new Date(v.encounterDate), "MMM d, yyyy")} ·{" "}
                      {v.doctor.user.name ?? v.doctor.designation}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {v.chiefComplaint ?? "Visit"} · {v.status}
                    </p>
                  </div>
                  {v.status === "FINALIZED" ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/encounters/${v.id}`}>View summary</Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">In progress</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageEnter>
  );
}
