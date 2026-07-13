"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import type { EquipmentRow, InventoryItem } from "@/lib/inventory";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AlertsResponse = {
  lowStock: InventoryItem[];
  equipmentDue: EquipmentRow[];
  count: number;
};

export function InventoryAlertsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory-alerts"],
    queryFn: () => apiFetch<AlertsResponse>("/api/inventory/alerts"),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading alerts…</p>;
  }

  const low = data?.lowStock ?? [];
  const due = data?.equipmentDue ?? [];
  const count = data?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inventory alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {count} item{count === 1 ? "" : "s"} need attention
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Low stock ({low.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {low.length === 0 ? (
            <EmptyState title="No low-stock items" description="All supplies are above threshold." />
          ) : (
            <ul className="divide-y divide-border">
              {low.map((i) => (
                <li key={i.id} className="flex justify-between gap-2 py-2 text-sm">
                  <span>
                    {i.name}{" "}
                    <span className="text-muted-foreground">· {i.department.name}</span>
                  </span>
                  <span className="font-medium text-destructive">
                    {i.currentStock}/{i.reorderThreshold} {i.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Equipment due for service ({due.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {due.length === 0 ? (
            <EmptyState
              title="No equipment due"
              description="Service dates are current."
            />
          ) : (
            <ul className="divide-y divide-border">
              {due.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 py-2 text-sm">
                  <span>
                    {e.name}{" "}
                    <span className="text-muted-foreground">
                      · {e.serialNo} · {e.department.name}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {e.status}
                    {e.nextServiceDueAt
                      ? ` · due ${format(new Date(e.nextServiceDueAt), "MMM d, yyyy")}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
