"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { formatCents, type InvoiceListRow } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PREVIEW = 3;

export function PatientInvoices() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: () =>
      apiFetch<{ data: InvoiceListRow[] }>("/api/billing/invoices/mine"),
  });

  const rows = data?.data ?? [];
  const visible = expanded ? rows : rows.slice(0, PREVIEW);
  const remaining = Math.max(0, rows.length - PREVIEW);

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-foreground">
          My invoices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <p className="text-xs text-muted-foreground">
          Settle open balances at the billing desk.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
            No invoices yet
          </p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {visible.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(inv.createdAt), "MMM d, yyyy")} ·{" "}
                      {formatCents(inv.totalCents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/billing/${inv.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
            {remaining > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : `Show all (${remaining} more)`}
              </button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
