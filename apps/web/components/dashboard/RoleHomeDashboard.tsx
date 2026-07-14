import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Package,
  Pill,
  Receipt,
  Scan,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DashboardChartCard,
  type ChartPalette,
} from "@/components/dashboard/DashboardChartCard";
import { DashboardChartGrid } from "@/components/dashboard/DashboardChartGrid";
import { DashboardHeroCard } from "@/components/dashboard/DashboardHeroCard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { QuickActions, type QuickAction } from "@/components/dashboard/QuickActions";
import { Button } from "@/components/ui/button";

type Kpi = {
  label: string;
  value: number | string;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "success" | "danger";
};

export type RoleChartSpec = {
  title: string;
  ariaLabel: string;
  rows: { label: string; value: number }[];
  type?: "bar" | "line" | "doughnut";
  palette?: ChartPalette;
};

type RoleHomeDashboardProps = {
  title: string;
  description: string;
  heroTitle: string;
  heroBody: string;
  illustrationSrc?: string;
  kpis: Kpi[];
  actions: QuickAction[];
  charts: RoleChartSpec[];
};

export function RoleHomeDashboard({
  title,
  description,
  heroTitle,
  heroBody,
  illustrationSrc,
  kpis,
  actions,
  charts,
}: RoleHomeDashboardProps) {
  return (
    <DashboardShell title={title} description={description}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <DashboardChartGrid>
        {charts.map((chart) => (
          <DashboardChartCard
            key={chart.title}
            title={chart.title}
            ariaLabel={chart.ariaLabel}
            rows={chart.rows}
            type={chart.type}
            palette={chart.palette}
          />
        ))}
      </DashboardChartGrid>

      <DashboardHeroCard
        title={heroTitle}
        body={heroBody}
        illustrationSrc={illustrationSrc}
      >
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.slice(0, 3).map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.href + action.label}
                asChild
                variant={action.variant ?? "outline"}
                size="sm"
              >
                <Link href={action.href}>
                  {Icon ? <Icon className="size-4" /> : null}
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </DashboardHeroCard>

      <QuickActions actions={actions} />
    </DashboardShell>
  );
}

export const RoleIcons = {
  ClipboardList,
  BedDouble,
  CalendarDays,
  AlertTriangle,
  Package,
  Pill,
  ShoppingCart,
  FlaskConical,
  Scan,
  Receipt,
  Users,
  UserPlus,
};
