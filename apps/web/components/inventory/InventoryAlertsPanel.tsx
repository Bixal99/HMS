"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Wrench } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { EquipmentRow, InventoryItem } from "@/lib/inventory";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AlertsResponse = {
  lowStock: InventoryItem[];
  equipmentDue: EquipmentRow[];
  count: number;
};

function stockSeverity(current: number, threshold: number) {
  if (threshold <= 0) return "low";
  const ratio = current / threshold;
  if (ratio <= 0.5) return "critical";
  return "low";
}

export function InventoryAlertsPanel() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["inventory-alerts"],
    queryFn: () => apiFetch<AlertsResponse>("/api/inventory/alerts"),
  });

  if (isLoading) {
    return (
      <div className="w-full min-w-0">
        <ListSkeleton rows={3} label="Loading alerts…" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="w-full min-w-0">
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const low = data?.lowStock ?? [];
  const due = data?.equipmentDue ?? [];
  const count = data?.count ?? 0;

  if (count === 0) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">All clear</p>
        </div>
        <EmptyState
          title="No alerts right now"
          description="Stock levels and equipment service dates are in good standing."
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inventory alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {count} item{count === 1 ? "" : "s"} need attention
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />
              Low stock ({low.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {low.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="divide-y divide-border">
                {low.map((i) => {
                  const severity = stockSeverity(i.currentStock, i.reorderThreshold);
                  return (
                    <li
                      key={i.id}
                      className="flex items-start justify-between gap-3 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{i.name}</p>
                        <p className="text-xs text-muted-foreground">{i.department.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                            severity === "critical"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-warning/15 text-foreground",
                          )}
                        >
                          {i.currentStock}/{i.reorderThreshold} {i.unit}
                        </span>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {severity === "critical" ? "Critical" : "Below reorder"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4 text-primary" />
              Equipment due ({due.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {due.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="divide-y divide-border">
                {due.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.serialNo} · {e.department.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                          e.status === "MAINTENANCE"
                            ? "bg-warning/15 text-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {e.status.replace(/_/g, " ")}
                      </span>
                      {e.nextServiceDueAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due {format(new Date(e.nextServiceDueAt), "MMM d, yyyy")}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
