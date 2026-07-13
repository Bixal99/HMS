"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { formatCents, type InvoiceListRow } from "@/lib/billing";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PatientInvoices() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: () =>
      apiFetch<{ data: InvoiceListRow[] }>("/api/billing/invoices/mine"),
  });

  const rows = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">My invoices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Please settle any outstanding balance at the billing desk. Online payment
          is not available in this release.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="When billing generates an invoice for your visits, it will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(inv.createdAt), "MMM d, yyyy")} ·{" "}
                    {formatCents(inv.totalCents)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {inv.status.replaceAll("_", " ")}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/billing/${inv.id}`}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
