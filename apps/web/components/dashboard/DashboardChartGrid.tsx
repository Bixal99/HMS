import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardChartGridProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardChartGrid({ children, className }: DashboardChartGridProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>{children}</div>
  );
}
