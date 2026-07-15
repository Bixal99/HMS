"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { InventoryItem } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { cn } from "@/lib/utils";

type RowState = InventoryItem & { countedStock: number };

const columnHelper = createColumnHelper<RowState>();

export function ReconcileGrid() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<RowState[] | null>(null);

  const { isLoading, isError, error, refetch } = useQuery({
    queryKey: ["inventory", "all"],
    queryFn: async () => {
      const res = await apiFetch<{ data: InventoryItem[] }>("/api/inventory?all=1");
      setRows(
        res.data.map((i) => ({
          ...i,
          countedStock: i.currentStock,
        })),
      );
      return res;
    },
  });

  const changed = useMemo(
    () => (rows ?? []).filter((r) => r.countedStock !== r.currentStock),
    [rows],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Item",
        cell: (info) => (
          <div>
            <p className="font-medium">{info.getValue()}</p>
            <p className="text-xs text-muted-foreground">
              {info.row.original.department.name}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("currentStock", {
        header: "System",
        cell: (info) => (
          <span className="tabular-nums">
            {info.getValue()} {info.row.original.unit}
          </span>
        ),
      }),
      columnHelper.accessor("countedStock", {
        header: "Counted",
        cell: (info) => (
          <Input
            type="number"
            min={0}
            className="h-8 w-24"
            value={info.getValue()}
            onChange={(e) => {
              const v = Math.max(0, parseInt(e.target.value || "0", 10));
              setRows((prev) =>
                (prev ?? []).map((r) =>
                  r.id === info.row.original.id ? { ...r, countedStock: v } : r,
                ),
              );
            }}
          />
        ),
      }),
      columnHelper.display({
        id: "delta",
        header: "Delta",
        cell: (info) => {
          const delta = info.row.original.countedStock - info.row.original.currentStock;
          return (
            <span
              className={cn(
                "tabular-nums font-medium",
                delta !== 0 && "text-primary",
              )}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ adjusted?: number }>("/api/inventory/reconcile", {
        method: "POST",
        body: JSON.stringify({
          counts: changed.map((r) => ({
            itemId: r.id,
            countedStock: r.countedStock,
          })),
        }),
      }),
    onSuccess: async (res) => {
      toast.success(`Reconciled ${res.adjusted ?? changed.length} item(s)`);
      await qc.invalidateQueries({ queryKey: ["inventory"] });
      await refetch();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Reconcile failed");
    },
  });

  if (isLoading || !rows) {
    return <ListSkeleton rows={5} label="Loading inventory…" />;
  }
  if (isError) {
    return <QueryErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {changed.length} row{changed.length === 1 ? "" : "s"} with changes will be
          submitted as ADJUSTMENT / MISCOUNT.
        </p>
        <Button
          type="button"
          disabled={changed.length === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Submitting…" : "Submit reconciliation"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const delta = row.original.countedStock - row.original.currentStock;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-border",
                    delta !== 0 && "bg-primary/5",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
