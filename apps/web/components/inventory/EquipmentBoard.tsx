"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import type { EquipmentRow } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { cn } from "@/lib/utils";

type EquipmentBoardProps = {
  role: string;
};

const STATUS_OPTIONS = [
  {
    value: "OPERATIONAL",
    label: "Operational",
    tone: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30",
  },
  {
    value: "MAINTENANCE",
    label: "Maintenance",
    tone: "bg-amber-500/15 text-amber-800 ring-amber-500/30",
  },
  {
    value: "RETIRED",
    label: "Retired",
    tone: "bg-slate-500/15 text-slate-700 ring-slate-500/30",
  },
] as const;

export function EquipmentBoard({ role }: EquipmentBoardProps) {
  const qc = useQueryClient();
  const canService = role === "ADMIN" || role === "LAB_TECHNICIAN";
  const [selected, setSelected] = useState<EquipmentRow | null>(null);
  const [status, setStatus] = useState("OPERATIONAL");
  const [nextDue, setNextDue] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["equipment", role === "ADMIN" ? "all" : "dept"],
    queryFn: () => {
      const q = role === "ADMIN" ? "?all=1" : "";
      return apiFetch<{ data: EquipmentRow[] }>(`/api/equipment${q}`);
    },
  });

  const rows = data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No equipment");
      return apiFetch(`/api/equipment/${selected.id}/service`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          nextServiceDueAt: nextDue ? new Date(nextDue).toISOString() : null,
        }),
      });
    },
    onSuccess: async () => {
      toast.success("Service logged");
      setSelected(null);
      await qc.invalidateQueries({ queryKey: ["equipment"] });
      await qc.invalidateQueries({ queryKey: ["inventory-alerts"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Equipment</h1>
        <p className="text-sm text-muted-foreground">
          Department equipment registry and maintenance logging.
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} label="Loading equipment…" />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No equipment" description="Add equipment from inventory admin tools, or seed demo devices." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="font-medium text-foreground">{e.name}</p>
                <p className="text-sm text-muted-foreground">
                  {e.serialNo} · {e.department.name} · {e.status}
                  {e.nextServiceDueAt
                    ? ` · next ${format(new Date(e.nextServiceDueAt), "MMM d, yyyy")}`
                    : ""}
                </p>
              </div>
              {canService ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelected(e);
                    setStatus(e.status);
                    setNextDue(
                      e.nextServiceDueAt
                        ? e.nextServiceDueAt.slice(0, 10)
                        : "",
                    );
                  }}
                >
                  Log service
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ActionDrawer
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelected(null)}
        icon={Wrench}
        title="Log service"
        description={
          selected ? (
            <>
              <span className="font-medium text-foreground">{selected.name}</span>
              <span className="mt-0.5 block">
                {selected.serialNo} · {selected.department.name}
              </span>
            </>
          ) : undefined
        }
        widthClass="w-[min(26rem,94vw)]"
        footer={
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setSelected(null)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Saving…" : "Save service log"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="grid grid-cols-1 gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <span className="font-medium text-foreground">{opt.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                      opt.tone,
                    )}
                  >
                    {opt.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eq-next">Next service due</Label>
          <Input
            id="eq-next"
            type="date"
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank if no follow-up date is scheduled yet.
          </p>
        </div>
      </ActionDrawer>
    </div>
  );
}
