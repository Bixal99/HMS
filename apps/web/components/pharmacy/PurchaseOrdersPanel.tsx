"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Supplier = { id: string; name: string };
type Medicine = {
  id: string;
  name: string;
  strength: string;
  totalStock: number;
};

type PoItem = {
  id: string;
  quantity: number;
  unitCostCents: number;
  medicine: { name: string; strength: string };
};

type PurchaseOrder = {
  id: string;
  status: string;
  supplier: { name: string };
  items: PoItem[];
};

export function PurchaseOrdersPanel() {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState("50");
  const [unitCostCents, setUnitCostCents] = useState("250");
  const [receiveLines, setReceiveLines] = useState<
    Record<string, { batchNo: string; expiryDate: string }>
  >({});

  const { data: suppliers } = useQuery({
    queryKey: ["pharmacy-suppliers"],
    queryFn: () => apiFetch<{ data: Supplier[] }>("/api/pharmacy/suppliers"),
  });

  const { data: medicines } = useQuery({
    queryKey: ["pharmacy-medicines"],
    queryFn: () => apiFetch<{ data: Medicine[] }>("/api/pharmacy/medicines"),
  });

  const { data: orders } = useQuery({
    queryKey: ["pharmacy-pos"],
    queryFn: () => apiFetch<{ data: PurchaseOrder[] }>("/api/pharmacy/purchase-orders"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/pharmacy/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          status: "ORDERED",
          items: [
            {
              medicineId,
              quantity: Number(quantity),
              unitCostCents: Number(unitCostCents),
            },
          ],
        }),
      }),
    onSuccess: () => {
      toast.success("Purchase order created");
      void queryClient.invalidateQueries({ queryKey: ["pharmacy-pos"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create PO failed"),
  });

  const receiveMutation = useMutation({
    mutationFn: (po: PurchaseOrder) => {
      const items = po.items.map((item) => {
        const line = receiveLines[item.id] ?? { batchNo: "", expiryDate: "" };
        return {
          purchaseOrderItemId: item.id,
          batchNo: line.batchNo,
          expiryDate: line.expiryDate,
        };
      });
      return apiFetch(`/api/pharmacy/purchase-orders/${po.id}/receive`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      });
    },
    onSuccess: () => {
      toast.success("PO received — batches created");
      void queryClient.invalidateQueries({ queryKey: ["pharmacy-pos"] });
      void queryClient.invalidateQueries({ queryKey: ["pharmacy-medicines"] });
      void queryClient.invalidateQueries({ queryKey: ["pharmacy-alerts"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Receive failed"),
  });

  return (
    <PageEnter>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Purchase orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Order stock and receive batches (batch number field works with keyboard scanners).
          </p>
        </div>

        <form
          className="grid max-w-xl gap-3 rounded-lg border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!supplierId || !medicineId) {
              toast.error("Select supplier and medicine");
              return;
            }
            createMutation.mutate();
          }}
        >
          <h2 className="text-sm font-medium text-foreground">New order</h2>
          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <select
              id="supplier"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select…</option>
              {(suppliers?.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="med">Medicine</Label>
            <select
              id="med"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={medicineId}
              onChange={(e) => setMedicineId(e.target.value)}
            >
              <option value="">Select…</option>
              {(medicines?.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.strength} (stock {m.totalStock})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cost">Unit cost (cents)</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                value={unitCostCents}
                onChange={(e) => setUnitCostCents(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            Create PO
          </Button>
        </form>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Open orders</h2>
          {(orders?.data ?? []).length === 0 ? (
            <EmptyState title="No purchase orders" description="Create one above." />
          ) : (
            <ul className="space-y-4">
              {(orders?.data ?? []).map((po) => (
                <li
                  key={po.id}
                  className={cn(
                    "rounded-lg border border-border bg-card p-4",
                    po.status === "RECEIVED" && "opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{po.supplier.name}</p>
                      <p className="text-sm text-muted-foreground">Status: {po.status}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-3">
                    {po.items.map((item) => (
                      <li key={item.id} className="space-y-2 text-sm">
                        <p>
                          {item.medicine.name} {item.medicine.strength} × {item.quantity} @{" "}
                          {item.unitCostCents}¢
                        </p>
                        {po.status !== "RECEIVED" ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`batch-${item.id}`}>Batch number</Label>
                              <Input
                                id={`batch-${item.id}`}
                                autoComplete="off"
                                placeholder="Scan or type batch…"
                                value={receiveLines[item.id]?.batchNo ?? ""}
                                onChange={(e) =>
                                  setReceiveLines((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      batchNo: e.target.value,
                                      expiryDate: prev[item.id]?.expiryDate ?? "",
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor={`exp-${item.id}`}>Expiry date</Label>
                              <Input
                                id={`exp-${item.id}`}
                                type="date"
                                value={receiveLines[item.id]?.expiryDate ?? ""}
                                onChange={(e) =>
                                  setReceiveLines((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      batchNo: prev[item.id]?.batchNo ?? "",
                                      expiryDate: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {po.status !== "RECEIVED" ? (
                    <Button
                      type="button"
                      className="mt-3"
                      onClick={() => receiveMutation.mutate(po)}
                      disabled={receiveMutation.isPending}
                    >
                      Receive & create batches
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageEnter>
  );
}
