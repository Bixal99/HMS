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

type FinancialData = {
  revenueByCategory: { sourceType: string; revenueCents: number }[];
  consultationByDepartment: {
    departmentName: string;
    revenueCents: number;
  }[];
  bedByDepartment: { departmentName: string; revenueCents: number }[];
  outstandingBalanceCents: number;
  claimsByStatus: { status: string; count: number }[];
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function FinancialPanelInner() {
  const { start, end } = useReportDateRange();
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "financial", start, end],
    queryFn: () =>
      apiFetch<FinancialData>(
        `/api/reports/financial?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
  });

  const totalRevenue =
    data?.revenueByCategory.reduce((s, r) => s + r.revenueCents, 0) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Financial report
          </h1>
          <p className="text-sm text-muted-foreground">
            Revenue by category, department splits, claims, and outstanding balance.
          </p>
        </div>
        <ExportDialog reportType="financial" start={start} end={end} />
      </div>
      <DateRangeFilter />
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiTile
          label="Total revenue"
          value={totalRevenue}
          format={(n) => money(n)}
        />
        <KpiTile
          label="Outstanding"
          value={data?.outstandingBalanceCents ?? null}
          format={(n) => money(n)}
        />
      </div>
      <ReportChart
        title="Revenue by category"
        ariaLabel="Bar chart of revenue by invoice source type in cents"
        loading={isLoading}
        rows={(data?.revenueByCategory ?? []).map((r) => ({
          label: r.sourceType,
          value: Math.round(r.revenueCents / 100),
        }))}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportChart
          title="Consultation revenue by department ($)"
          ariaLabel="Consultation revenue by department in dollars"
          loading={isLoading}
          rows={(data?.consultationByDepartment ?? []).map((r) => ({
            label: r.departmentName,
            value: Math.round(r.revenueCents / 100),
          }))}
        />
        <ReportChart
          title="Bed revenue by department ($)"
          ariaLabel="Bed revenue by department in dollars"
          loading={isLoading}
          rows={(data?.bedByDepartment ?? []).map((r) => ({
            label: r.departmentName,
            value: Math.round(r.revenueCents / 100),
          }))}
        />
      </div>
      <ReportChart
        title="Insurance claims by status"
        ariaLabel="Count of insurance claims by status"
        loading={isLoading}
        rows={(data?.claimsByStatus ?? []).map((r) => ({
          label: r.status,
          value: r.count,
        }))}
      />
    </div>
  );
}

export function FinancialDashboard() {
  return (
    <Suspense fallback={<InlineLoader label="Loading report…" />}>
      <FinancialPanelInner />
    </Suspense>
  );
}
