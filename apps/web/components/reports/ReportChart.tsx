"use client";

import { useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import { ensureChartsRegistered } from "@/lib/charts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

ensureChartsRegistered();

export type ChartRow = { label: string; value: number };

type ReportChartProps = {
  title: string;
  ariaLabel: string;
  rows: ChartRow[];
  loading?: boolean;
  type?: "bar" | "line";
  className?: string;
};

export function ReportChart({
  title,
  ariaLabel,
  rows,
  loading,
  type = "bar",
  className,
}: ReportChartProps) {
  const [asTable, setAsTable] = useState(false);

  if (loading) {
    return (
      <div className={cn("space-y-3 rounded-lg border border-border p-4", className)}>
        <div className="h-5 w-40 animate-shimmer rounded bg-muted" />
        <div className="h-56 animate-shimmer rounded bg-muted" />
      </div>
    );
  }

  const data = {
    labels: rows.map((r) => r.label),
    datasets: [
      {
        label: title,
        data: rows.map((r) => r.value),
        backgroundColor: "rgba(26, 92, 214, 0.55)",
        borderColor: "rgb(26, 92, 214)",
        borderWidth: 1.5,
        tension: 0.3,
        fill: type === "line",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAsTable((v) => !v)}
        >
          {asTable ? "View as chart" : "View as table"}
        </Button>
      </div>
      {asTable ? (
        <table className="w-full text-sm" aria-label={ariaLabel}>
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 font-medium">Label</th>
              <th className="py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border/60">
                <td className="py-1.5">{r.label}</td>
                <td className="py-1.5 text-right tabular-nums">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-56" role="img" aria-label={ariaLabel}>
          {type === "line" ? (
            <Line data={data} options={options} />
          ) : (
            <Bar data={data} options={options} />
          )}
        </div>
      )}
    </div>
  );
}
