"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { REASON_CODES, type InventoryItem } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { cn } from "@/lib/utils";

type InventoryBoardProps = {
  role: string;
  departmentId?: string | null;
};

export function InventoryBoard({ role, departmentId }: InventoryBoardProps) {
  const qc = useQueryClient();
  const isAdmin = role === "ADMIN";
  const [viewAll, setViewAll] = useState(false);
  const [itemId, setItemId] = useState("");
  const [txType, setTxType] = useState<"IN" | "OUT" | "ADJUSTMENT">(
    role === "NURSE" ? "OUT" : "OUT",
  );
  const [qty, setQty] = useState("1");
  const [reasonCode, setReasonCode] = useState<string>(
    role === "NURSE" ? "USED" : "USED",
  );

  const queryKey = useMemo(
    () => ["inventory", viewAll ? "all" : departmentId ?? "dept"],
    [viewAll, departmentId],
  );

  const { data, isLoading, error, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (isAdmin && viewAll) params.set("all", "1");
      const q = params.toString();
      return apiFetch<{ data: InventoryItem[] }>(`/api/inventory${q ? `?${q}` : ""}`);
    },
  });

  const items = data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/inventory/transactions", {
        method: "POST",
        body: JSON.stringify({
          itemId,
          type: txType,
          quantity:
            txType === "ADJUSTMENT"
              ? Math.trunc(Number(qty))
              : Math.abs(Math.trunc(Number(qty))),
          reasonCode,
        }),
      }),
    onSuccess: async () => {
      toast.success("Stock updated");
      await qc.invalidateQueries({ queryKey: ["inventory"] });
      await qc.invalidateQueries({ queryKey: ["inventory-alerts"] });
      setQty("1");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Transaction failed");
    },
  });

  const nurseLocked = role === "NURSE";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Non-pharmacy consumables and supplies by department.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <>
              <Button
                type="button"
                variant={viewAll ? "default" : "outline"}
                size="sm"
                onClick={() => setViewAll((v) => !v)}
              >
                {viewAll ? "Viewing all departments" : "View all departments"}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/inventory/reconcile">Reconcile</Link>
              </Button>
            </>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href="/inventory/alerts">Alerts</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/inventory/equipment">Equipment</Link>
          </Button>
        </div>
      </div>

      {(role === "ADMIN" || role === "NURSE") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log stock change</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="inv-item">Item</Label>
              <select
                id="inv-item"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              >
                <option value="">Select…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.currentStock} {i.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-type">Type</Label>
              <select
                id="inv-type"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={txType}
                disabled={nurseLocked}
                onChange={(e) => setTxType(e.target.value as typeof txType)}
              >
                {!nurseLocked ? <option value="IN">IN</option> : null}
                <option value="OUT">OUT</option>
                {!nurseLocked ? <option value="ADJUSTMENT">ADJUSTMENT</option> : null}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-qty">
                Quantity{txType === "ADJUSTMENT" ? " (signed)" : ""}
              </Label>
              <Input
                id="inv-qty"
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-reason">Reason</Label>
              <select
                id="inv-reason"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
              >
                {REASON_CODES.filter((r) =>
                  nurseLocked ? r === "USED" || r === "DAMAGED" || r === "OTHER" : true,
                ).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-5">
              <Button
                type="button"
                disabled={!itemId || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Saving…" : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <ListSkeleton rows={4} label="Loading inventory…" />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No inventory items"
          description="Admin can create catalog items or re-run seed data."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((item) => {
            const low = item.currentStock < item.reorderThreshold;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 px-4 py-3",
                  low && "bg-warning/10",
                )}
              >
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.department.name} · {item.category} · threshold{" "}
                    {item.reorderThreshold}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {item.currentStock}{" "}
                  <span className="font-normal text-muted-foreground">{item.unit}</span>
                  {low ? (
                    <span className="ml-2 text-xs font-semibold text-destructive">
                      Low
                    </span>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
