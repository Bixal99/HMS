"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { EquipmentRow } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/shared/EmptyState";

type EquipmentBoardProps = {
  role: string;
};

export function EquipmentBoard({ role }: EquipmentBoardProps) {
  const qc = useQueryClient();
  const canService = role === "ADMIN" || role === "LAB_TECHNICIAN";
  const [selected, setSelected] = useState<EquipmentRow | null>(null);
  const [status, setStatus] = useState("OPERATIONAL");
  const [nextDue, setNextDue] = useState("");

  const { data, isLoading } = useQuery({
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
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No equipment" description="Seed data will populate demo devices." />
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

      <Drawer open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent className="max-h-[90vh] w-[min(28rem,94vw)] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>Service — {selected?.name}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <div className="space-y-1">
              <Label htmlFor="eq-status">Status</Label>
              <select
                id="eq-status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="OPERATIONAL">OPERATIONAL</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="RETIRED">RETIRED</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="eq-next">Next service due</Label>
              <Input
                id="eq-next"
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
