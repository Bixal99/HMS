"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { apiFetch, API_BASE, ApiError } from "@/lib/api";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { PageEnter } from "@/components/shared/PageEnter";
import { BoardSkeleton } from "@/components/shared/BoardSkeleton";
import { InlineLoader } from "@/components/shared/InlineLoader";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActionDrawer } from "@/components/shared/ActionDrawer";

const COLUMNS = [
  { id: "PENDING_REVIEW", label: "Pending review" },
  { id: "PREPARING", label: "Preparing" },
  { id: "READY_FOR_PICKUP", label: "Ready for pickup" },
  { id: "COMPLETED", label: "Completed" },
] as const;

type Stage = (typeof COLUMNS)[number]["id"];

type QueueRx = {
  id: string;
  pharmacyStage: Stage;
  columnId: Stage;
  status: string;
  createdAt: string;
  patient: { firstName: string; lastName: string; mrn: string };
  items: Array<{ id: string }>;
};

type DetailItem = {
  id: string;
  quantityPrescribed: number;
  dispensed: number;
  remaining: number;
  dosage: string;
  frequency: string;
  medicine: { name: string; strength: string };
  fefoBatch: {
    id: string;
    batchNo: string;
    expiryDate: string;
    quantityInStock: number;
  } | null;
  availableBatches: Array<{
    id: string;
    batchNo: string;
    expiryDate: string;
    quantityInStock: number;
  }>;
};

export function FulfillmentBoard() {
  const queryClient = useQueryClient();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [overrideBatch, setOverrideBatch] = useState<Record<string, string>>({});
  const [stockAlternatives, setStockAlternatives] = useState<string[]>([]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["pharmacy-queue"],
    queryFn: async () => {
      const res = await apiFetch<{ data: Record<Stage, Omit<QueueRx, "columnId">[]> }>(
        "/api/pharmacy/queue",
      );
      const flat: QueueRx[] = [];
      for (const stage of COLUMNS.map((c) => c.id)) {
        for (const rx of res.data[stage] ?? []) {
          flat.push({ ...rx, columnId: stage, pharmacyStage: stage });
        }
      }
      return flat;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ["pharmacy-rx", drawerId],
    enabled: Boolean(drawerId),
    queryFn: () =>
      apiFetch<{
        id: string;
        patient: { firstName: string; lastName: string; mrn: string };
        items: DetailItem[];
      }>(`/api/pharmacy/queue/${drawerId}`),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, pharmacyStage }: { id: string; pharmacyStage: Stage }) =>
      apiFetch(`/api/pharmacy/queue/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ pharmacyStage }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pharmacy-queue"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Stage update failed"),
  });

  const dispenseMutation = useMutation({
    mutationFn: async ({
      itemId,
      overrideBatchId,
    }: {
      itemId: string;
      overrideBatchId?: string;
    }) => {
      const res = await fetch(`${API_BASE}/api/pharmacy/dispense/${itemId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(overrideBatchId ? { overrideBatchId } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        alternatives?: string[];
      };
      if (!res.ok) {
        if (res.status === 409 && body.alternatives?.length) {
          setStockAlternatives(body.alternatives);
        }
        throw new ApiError(res.status, body.error ?? res.statusText);
      }
      setStockAlternatives([]);
      return body;
    },
    onSuccess: () => {
      toast.success("Dispensed");
      void queryClient.invalidateQueries({ queryKey: ["pharmacy-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["pharmacy-rx", drawerId] });
      void queryClient.invalidateQueries({ queryKey: ["pharmacy-alerts"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Dispense failed"),
  });

  return (
    <PageEnter>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Fulfillment queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag prescriptions across stages. Dispense from the card drawer.
          </p>
        </div>

        {isLoading ? (
          <BoardSkeleton columns={4} label="Loading pharmacy queue…" />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No prescriptions in queue"
            description="New prescriptions from doctors appear here for fulfillment."
          />
        ) : (
          <KanbanBoard
            columns={[...COLUMNS]}
            items={data}
            onMove={(id, to) =>
              stageMutation.mutate({ id, pharmacyStage: to as Stage })
            }
            onCardOpen={(item) => setDrawerId(item.id)}
            renderCard={(rx, { open }) => (
              <button
                type="button"
                className="w-full text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
              >
                <p className="font-medium text-foreground">
                  {rx.patient.firstName} {rx.patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{rx.patient.mrn}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rx.items.length} item{rx.items.length === 1 ? "" : "s"} ·{" "}
                  {formatDistanceToNow(new Date(rx.createdAt), { addSuffix: true })}
                </p>
              </button>
            )}
            renderOverlay={(rx) => (
              <div className="rounded-lg border border-primary/50 bg-card p-3 shadow-2xl ring-2 ring-primary/25">
                <p className="font-medium">
                  {rx.patient.firstName} {rx.patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rx.items.length} item{rx.items.length === 1 ? "" : "s"}
                </p>
              </div>
            )}
          />
        )}
      </div>

      <ActionDrawer
        open={Boolean(drawerId)}
        onOpenChange={(o) => {
          if (!o) {
            setDrawerId(null);
            setStockAlternatives([]);
          }
        }}
        title={
          detail
            ? `${detail.patient.firstName} ${detail.patient.lastName} · ${detail.patient.mrn}`
            : "Prescription"
        }
        widthClass="w-[min(28rem,92vw)]"
        footer={
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setDrawerId(null);
              setStockAlternatives([]);
            }}
          >
            Close
          </Button>
        }
      >
        {stockAlternatives.length > 0 ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium text-foreground">Suggested in-stock alternatives</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {stockAlternatives.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {!detail ? (
          <InlineLoader label="Loading prescription…" />
        ) : (
          detail.items.map((item) => (
            <div
              key={item.id}
              className="space-y-2 rounded-md border border-border p-3"
            >
              <p className="font-medium text-foreground">
                {item.medicine.name} {item.medicine.strength}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.dosage} · {item.frequency} · qty {item.quantityPrescribed}{" "}
                (dispensed {item.dispensed}, remaining {item.remaining})
              </p>
              {item.fefoBatch ? (
                <p className="text-sm text-foreground">
                  FEFO suggestion: batch{" "}
                  <span className="font-medium">{item.fefoBatch.batchNo}</span> · expires{" "}
                  {new Date(item.fefoBatch.expiryDate).toLocaleDateString()} ·{" "}
                  {item.fefoBatch.quantityInStock} in stock
                </p>
              ) : (
                <p className="text-sm text-destructive">No stock available</p>
              )}
              <div className="space-y-1">
                <Label htmlFor={`batch-${item.id}`}>Use different batch</Label>
                <select
                  id={`batch-${item.id}`}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={overrideBatch[item.id] ?? ""}
                  onChange={(e) =>
                    setOverrideBatch((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                >
                  <option value="">FEFO default</option>
                  {item.availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNo} · exp {new Date(b.expiryDate).toLocaleDateString()} · qty{" "}
                      {b.quantityInStock}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                disabled={item.remaining <= 0 || dispenseMutation.isPending}
                onClick={() =>
                  dispenseMutation.mutate({
                    itemId: item.id,
                    overrideBatchId: overrideBatch[item.id] || undefined,
                  })
                }
              >
                {item.remaining <= 0 ? "Fully dispensed" : "Dispense remaining"}
              </Button>
            </div>
          ))
        )}
      </ActionDrawer>
    </PageEnter>
  );
}
