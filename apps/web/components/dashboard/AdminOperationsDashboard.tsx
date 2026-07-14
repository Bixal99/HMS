"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  Receipt,
  Settings,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard";
import { DashboardChartGrid } from "@/components/dashboard/DashboardChartGrid";
import { DashboardHeroCard } from "@/components/dashboard/DashboardHeroCard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import type { ChartSeriesSpec } from "@/lib/role-dashboard-series";

type OperationalData = {
  totalAppointments: number;
  noShowCount: number;
  noShowRate: number;
  avgWaitMinutes: number | null;
  dailyVolume: { day: string; count: number }[];
};

function lastSevenDaysRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

type AdminOperationsDashboardProps = {
  pendingLeave: number;
  pharmacyAlerts: number;
  inventoryAlerts: number;
  billingAlerts: number;
  labQueue: number;
  pharmacyQueue: number;
  radiologyQueue: number;
  bedOccupancy: ChartSeriesSpec;
};

export function AdminOperationsDashboard({
  pendingLeave,
  pharmacyAlerts,
  inventoryAlerts,
  billingAlerts,
  labQueue,
  pharmacyQueue,
  radiologyQueue,
  bedOccupancy,
}: AdminOperationsDashboardProps) {
  const { start, end } = lastSevenDaysRange();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "admin", "operational", start, end],
    queryFn: () =>
      apiFetch<OperationalData>(
        `/api/reports/operational?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
  });

  const appointmentRows =
    data?.dailyVolume.map((r) => ({
      label: r.day.slice(5),
      value: r.count,
    })) ?? [];

  const alertMixRows = [
    { label: "Leave", value: pendingLeave },
    { label: "Pharmacy", value: pharmacyAlerts },
    { label: "Lab queue", value: labQueue },
    { label: "Billing", value: billingAlerts },
    { label: "Inventory", value: inventoryAlerts },
  ];

  const workloadRows = [
    { label: "Pharmacy", value: pharmacyQueue },
    { label: "Inventory", value: inventoryAlerts },
    { label: "Lab", value: labQueue },
    { label: "Imaging", value: radiologyQueue },
  ];

  return (
    <DashboardShell
      title="Admin dashboard"
      description="Operations overview across leave, stock, billing, and appointment volume."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pending leave"
          value={pendingLeave}
          icon={ClipboardList}
          tone={pendingLeave > 0 ? "warning" : "default"}
          hint="Awaiting approval"
        />
        <KpiCard
          label="Pharmacy alerts"
          value={pharmacyAlerts}
          icon={AlertTriangle}
          tone={pharmacyAlerts > 0 ? "danger" : "success"}
        />
        <KpiCard
          label="Inventory alerts"
          value={inventoryAlerts}
          icon={Package}
          tone={inventoryAlerts > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Billing alerts"
          value={billingAlerts}
          icon={Receipt}
          tone={billingAlerts > 0 ? "warning" : "default"}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-shimmer rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : (
        <DashboardChartGrid>
          <DashboardChartCard
            title="Appointments (last 7 days)"
            ariaLabel="Bar chart of appointment volume for the last seven days"
            rows={appointmentRows}
            type="bar"
            palette="blue"
          />
          <DashboardChartCard
            title="Alert mix"
            ariaLabel="Doughnut of operational alerts across departments"
            rows={alertMixRows}
            type="doughnut"
            palette="rose"
          />
          <DashboardChartCard
            title={bedOccupancy.title}
            ariaLabel={bedOccupancy.ariaLabel}
            rows={bedOccupancy.rows}
            type={bedOccupancy.type ?? "doughnut"}
            palette={bedOccupancy.palette ?? "violet"}
          />
          <DashboardChartCard
            title="Ops workload snapshot"
            ariaLabel="Bar chart of pharmacy, inventory, lab, and imaging workload"
            rows={workloadRows}
            type="bar"
            palette="slate"
          />
        </DashboardChartGrid>
      )}

      <DashboardHeroCard
        title="Keep the hospital running"
        body="Jump into inventory reconciliation, invoices, or reports when alerts spike."
        illustrationSrc="/illustrations/auth-login.svg"
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/billing">
              <Receipt className="size-4" />
              Invoices
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/inventory">
              <Package className="size-4" />
              Inventory
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings">
              <Settings className="size-4" />
              Settings
            </Link>
          </Button>
        </div>
      </DashboardHeroCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Appointments (range)"
          value={data?.totalAppointments ?? "—"}
          hint="Last 7 days"
        />
        <KpiCard
          label="No-show rate"
          value={data ? `${(data.noShowRate * 100).toFixed(1)}%` : "—"}
        />
        <KpiCard
          label="Avg wait (min)"
          value={
            data?.avgWaitMinutes == null ? "—" : data.avgWaitMinutes.toFixed(1)
          }
        />
      </div>

      <QuickActions
        actions={[
          { href: "/inventory", label: "Inventory", icon: Package },
          { href: "/inventory/reconcile", label: "Reconcile stock" },
          { href: "/billing", label: "Invoices", icon: Receipt, variant: "default" },
          { href: "/reports/operational", label: "Operational report", icon: ClipboardList },
          { href: "/reports/financial", label: "Financial report" },
          { href: "/reports/clinical", label: "Clinical report" },
          { href: "/settings", label: "Settings", icon: Settings },
        ]}
      />
    </DashboardShell>
  );
}
