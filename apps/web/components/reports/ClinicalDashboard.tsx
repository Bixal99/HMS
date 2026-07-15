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
import { InlineLoader } from "@/components/shared/InlineLoader";

type ClinicalData = {
  doctorId: string | null;
  topDiagnoses: {
    icdCode: string | null;
    description: string;
    count: number;
  }[];
  rxVolumeByDay: { day: string; count: number }[];
  dailyBedOccupancy: {
    day: string;
    occupiedBeds: number;
    totalBeds: number;
    occupancyRate: number | null;
  }[];
};

function ClinicalPanelInner() {
  const { start, end } = useReportDateRange();
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "clinical", start, end],
    queryFn: () =>
      apiFetch<ClinicalData>(
        `/api/reports/clinical?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
  });

  const avgOcc =
    data && data.dailyBedOccupancy.length
      ? data.dailyBedOccupancy.reduce(
          (s, d) => s + (d.occupancyRate ?? 0),
          0,
        ) / data.dailyBedOccupancy.length
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Clinical report
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.doctorId
              ? "Your diagnoses and prescriptions; bed occupancy is hospital-wide."
              : "Hospital-wide diagnoses, prescriptions, and bed occupancy."}
          </p>
        </div>
        <ExportDialog reportType="clinical" start={start} end={end} />
      </div>
      <DateRangeFilter />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile
          label="Top diagnosis count"
          value={data?.topDiagnoses.reduce((s, d) => s + d.count, 0) ?? null}
        />
        <KpiTile
          label="Prescriptions"
          value={
            data?.rxVolumeByDay.reduce((s, d) => s + d.count, 0) ?? null
          }
        />
        <KpiTile
          label="Avg occupancy"
          value={avgOcc == null ? null : avgOcc * 100}
          format={(n) => `${n.toFixed(1)}%`}
        />
      </div>
      <ReportChart
        title="Top diagnoses"
        ariaLabel="Bar chart of most frequent diagnoses"
        loading={isLoading}
        rows={(data?.topDiagnoses ?? []).slice(0, 10).map((d) => ({
          label: d.icdCode
            ? `${d.icdCode} ${d.description}`
            : d.description,
          value: d.count,
        }))}
      />
      <ReportChart
        title="Prescription volume by day"
        ariaLabel="Line chart of prescriptions created per day"
        type="line"
        loading={isLoading}
        rows={(data?.rxVolumeByDay ?? []).map((r) => ({
          label: r.day,
          value: r.count,
        }))}
      />
      <ReportChart
        title="Daily bed occupancy (%)"
        ariaLabel="Line chart of bed occupancy rate by day"
        type="line"
        loading={isLoading}
        rows={(data?.dailyBedOccupancy ?? []).map((r) => ({
          label: r.day,
          value: r.occupancyRate == null ? 0 : Math.round(r.occupancyRate * 100),
        }))}
      />
    </div>
  );
}

export function ClinicalDashboard() {
  return (
    <Suspense fallback={<InlineLoader label="Loading report…" />}>
      <ClinicalPanelInner />
    </Suspense>
  );
}
