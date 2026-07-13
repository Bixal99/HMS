"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  DateRangeFilter,
  useReportDateRange,
} from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { ReportChart } from "@/components/reports/ReportChart";
import { ExportDialog } from "@/components/reports/ExportDialog";

type OperationalData = {
  totalAppointments: number;
  noShowCount: number;
  noShowRate: number;
  avgWaitMinutes: number | null;
  dailyVolume: { day: string; count: number }[];
};

function OperationalPanelInner() {
  const { start, end } = useReportDateRange();
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "operational", start, end],
    queryFn: () =>
      apiFetch<OperationalData>(
        `/api/reports/operational?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Operational report
          </h1>
          <p className="text-sm text-muted-foreground">
            Appointment volume, no-shows, and average wait time.
          </p>
        </div>
        <ExportDialog reportType="operational" start={start} end={end} />
      </div>
      <DateRangeFilter />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Appointments" value={data?.totalAppointments ?? null} />
        <KpiTile label="No-shows" value={data?.noShowCount ?? null} />
        <KpiTile
          label="No-show rate"
          value={data ? data.noShowRate * 100 : null}
          format={(n) => `${n.toFixed(1)}%`}
        />
        <KpiTile
          label="Avg wait (min)"
          value={data?.avgWaitMinutes ?? null}
          format={(n) => n.toFixed(1)}
        />
      </div>
      <ReportChart
        title="Daily appointment volume"
        ariaLabel="Bar chart of appointments scheduled per day"
        loading={isLoading}
        rows={(data?.dailyVolume ?? []).map((r) => ({
          label: r.day,
          value: r.count,
        }))}
      />
    </div>
  );
}

export function OperationalDashboard() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <OperationalPanelInner />
    </Suspense>
  );
}
