"use client";

import { Bar, Doughnut, Line } from "react-chartjs-2";
import { ensureChartsRegistered } from "@/lib/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

ensureChartsRegistered();

export type DashboardChartRow = { label: string; value: number };

export type ChartPalette = "blue" | "teal" | "amber" | "rose" | "violet" | "slate";

const PALETTES: Record<ChartPalette, { fill: string[]; stroke: string[] }> = {
  blue: {
    fill: [
      "rgba(37, 99, 235, 0.7)",
      "rgba(59, 130, 246, 0.55)",
      "rgba(96, 165, 250, 0.5)",
      "rgba(147, 197, 253, 0.45)",
      "rgba(191, 219, 254, 0.4)",
    ],
    stroke: ["rgb(37, 99, 235)", "rgb(59, 130, 246)", "rgb(96, 165, 250)"],
  },
  teal: {
    fill: [
      "rgba(13, 148, 136, 0.7)",
      "rgba(20, 184, 166, 0.55)",
      "rgba(45, 212, 191, 0.5)",
      "rgba(94, 234, 212, 0.45)",
      "rgba(153, 246, 228, 0.4)",
    ],
    stroke: ["rgb(13, 148, 136)", "rgb(20, 184, 166)", "rgb(45, 212, 191)"],
  },
  amber: {
    fill: [
      "rgba(217, 119, 6, 0.7)",
      "rgba(245, 158, 11, 0.55)",
      "rgba(251, 191, 36, 0.5)",
      "rgba(252, 211, 77, 0.45)",
      "rgba(253, 230, 138, 0.4)",
    ],
    stroke: ["rgb(217, 119, 6)", "rgb(245, 158, 11)", "rgb(251, 191, 36)"],
  },
  rose: {
    fill: [
      "rgba(225, 29, 72, 0.7)",
      "rgba(244, 63, 94, 0.55)",
      "rgba(251, 113, 133, 0.5)",
      "rgba(253, 164, 175, 0.45)",
      "rgba(254, 205, 211, 0.4)",
    ],
    stroke: ["rgb(225, 29, 72)", "rgb(244, 63, 94)", "rgb(251, 113, 133)"],
  },
  violet: {
    fill: [
      "rgba(124, 58, 237, 0.7)",
      "rgba(139, 92, 246, 0.55)",
      "rgba(167, 139, 250, 0.5)",
      "rgba(196, 181, 253, 0.45)",
      "rgba(221, 214, 254, 0.4)",
    ],
    stroke: ["rgb(124, 58, 237)", "rgb(139, 92, 246)", "rgb(167, 139, 250)"],
  },
  slate: {
    fill: [
      "rgba(71, 85, 105, 0.7)",
      "rgba(100, 116, 139, 0.55)",
      "rgba(148, 163, 184, 0.5)",
      "rgba(203, 213, 225, 0.45)",
      "rgba(226, 232, 240, 0.4)",
    ],
    stroke: ["rgb(71, 85, 105)", "rgb(100, 116, 139)", "rgb(148, 163, 184)"],
  },
};

type DashboardChartCardProps = {
  title: string;
  ariaLabel: string;
  rows: DashboardChartRow[];
  type?: "bar" | "line" | "doughnut";
  palette?: ChartPalette;
  emptyMessage?: string;
  className?: string;
};

export function DashboardChartCard({
  title,
  ariaLabel,
  rows,
  type = "bar",
  palette = "blue",
  emptyMessage = "No data for this period yet.",
  className,
}: DashboardChartCardProps) {
  const colors = PALETTES[palette];
  const isDoughnut = type === "doughnut";

  const data = {
    labels: rows.map((r) => r.label),
    datasets: [
      {
        label: title,
        data: rows.map((r) => r.value),
        backgroundColor: isDoughnut
          ? rows.map((_, i) => colors.fill[i % colors.fill.length])
          : type === "line"
            ? colors.fill[0]
            : rows.map((_, i) => colors.fill[i % colors.fill.length]),
        borderColor: isDoughnut
          ? rows.map((_, i) => colors.stroke[i % colors.stroke.length])
          : colors.stroke[0],
        borderWidth: isDoughnut ? 2 : 1.5,
        tension: 0.35,
        fill: type === "line",
        borderRadius: type === "bar" ? 4 : undefined,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: isDoughnut,
        position: "bottom" as const,
        labels: { boxWidth: 12, padding: 12, font: { size: 11 } },
      },
    },
    ...(isDoughnut
      ? { cutout: "58%" }
      : {
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
          },
        }),
  };

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wide text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 || rows.every((r) => r.value === 0) ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="h-56" role="img" aria-label={ariaLabel}>
            {type === "line" ? (
              <Line data={data} options={options} />
            ) : type === "doughnut" ? (
              <Doughnut data={data} options={options} />
            ) : (
              <Bar data={data} options={options} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
