"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { formatCents, type InvoiceListRow } from "@/lib/billing";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ISSUED: "bg-primary/10 text-primary",
  PARTIALLY_PAID: "bg-warning/15 text-foreground",
  PAID: "bg-success/15 text-success",
  VOID: "bg-destructive/10 text-destructive",
};

type InvoiceListProps = {
  patientId?: string;
};

export function InvoiceList({ patientId }: InvoiceListProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["billing-invoices", patientId ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (patientId) params.set("patientId", patientId);
      const q = params.toString();
      return apiFetch<{ data: InvoiceListRow[] }>(
        `/api/billing/invoices${q ? `?${q}` : ""}`,
      );
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <ListSkeleton rows={4} label="Loading invoices…" />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Generate an invoice from a patient's unbilled encounters, pharmacy, lab, and bed charges."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-foreground">
                  {inv.patient
                    ? `${inv.patient.lastName}, ${inv.patient.firstName}`
                    : "Invoice"}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    #{inv.id.slice(0, 8)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(inv.createdAt), "MMM d, yyyy")} ·{" "}
                  {formatCents(inv.totalCents)}
                  {inv._count ? ` · ${inv._count.items} item(s)` : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                    STATUS_CLASS[inv.status] ?? "bg-muted",
                  )}
                >
                  {inv.status.replaceAll("_", " ")}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/billing/${inv.id}`}>Open</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
