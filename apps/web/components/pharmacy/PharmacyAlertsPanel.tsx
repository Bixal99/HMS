"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
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
  const { data, isLoading } = useQuery({
    queryKey: ["pharmacy-alerts"],
    queryFn: () => apiFetch<AlertsResponse>("/api/pharmacy/alerts"),
  });

  return (
    <PageEnter>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pharmacy alerts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Low stock and batches expiring within 30 days.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.count === 0 ? (
          <EmptyState title="All clear" description="No low-stock or near-expiry alerts." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Low stock
              </h2>
              {data.lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-2">
                  {data.lowStock.map((a) => (
                    <li
                      key={a.medicineName}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span
                        className={cn(
                          "mr-2 inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
                          "bg-amber-100 text-amber-900",
                        )}
                      >
                        Low stock
                      </span>
                      {a.message}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Near expiry
              </h2>
              {data.nearExpiry.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-2">
                  {data.nearExpiry.map((a) => (
                    <li
                      key={`${a.batchNo}-${a.medicineName}`}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span
                        className={cn(
                          "mr-2 inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
                          a.daysUntilExpiry < 0
                            ? "bg-destructive/15 text-destructive"
                            : "bg-orange-100 text-orange-900",
                        )}
                      >
                        {a.daysUntilExpiry < 0
                          ? "Expired"
                          : `Expires in ${a.daysUntilExpiry} days`}
                      </span>
                      {a.medicineName} · {a.message}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </PageEnter>
  );
}
