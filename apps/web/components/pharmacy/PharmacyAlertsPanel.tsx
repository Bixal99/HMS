"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AlertsResponse = {
  count: number;
  lowStock: Array<{
    medicineName: string;
    totalStock: number;
    reorderThreshold: number;
    message: string;
  }>;
  nearExpiry: Array<{
    medicineName: string;
    batchNo: string;
    daysUntilExpiry: number;
    message: string;
  }>;
};

export function PharmacyAlertsPanel() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["pharmacy-alerts"],
    queryFn: () => apiFetch<AlertsResponse>("/api/pharmacy/alerts"),
  });

  return (
    <PageEnter>
      <div className="w-full min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pharmacy alerts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Low stock and batches expiring within 30 days.
          </p>
        </div>

        {isLoading ? (
          <ListSkeleton rows={3} label="Loading pharmacy alerts…" />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : !data || data.count === 0 ? (
          <EmptyState title="All clear" description="No low-stock or near-expiry alerts." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="size-4 text-warning" />
                  Low stock ({data.lowStock.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.lowStock.map((a) => (
                      <li
                        key={a.medicineName}
                        className="flex items-start justify-between gap-3 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{a.medicineName}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.totalStock} on hand · threshold {a.reorderThreshold}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-foreground">
                          Low stock
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 text-destructive" />
                  Near expiry ({data.nearExpiry.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.nearExpiry.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.nearExpiry.map((a) => (
                      <li
                        key={`${a.batchNo}-${a.medicineName}`}
                        className="flex items-start justify-between gap-3 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{a.medicineName}</p>
                          <p className="text-xs text-muted-foreground">
                            Batch {a.batchNo}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold",
                            a.daysUntilExpiry < 0
                              ? "bg-destructive/15 text-destructive"
                              : "bg-warning/15 text-foreground",
                          )}
                        >
                          {a.daysUntilExpiry < 0
                            ? "Expired"
                            : `${a.daysUntilExpiry}d left`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageEnter>
  );
}
