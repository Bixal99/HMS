"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Modality = {
  id: string;
  name: string;
  code: string;
  priceCents: number;
};

export function OrderRadiologyForm({
  encounterId,
  onDone,
}: {
  encounterId: string;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Modality[]>([]);

  const { data } = useQuery({
    queryKey: ["radiology-modalities"],
    queryFn: () => apiFetch<{ data: Modality[] }>("/api/radiology/modalities"),
  });

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data?.data ?? [];
    if (!needle) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(needle) ||
        m.code.toLowerCase().includes(needle),
    );
  }, [data, q]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/radiology/orders", {
        method: "POST",
        body: JSON.stringify({
          encounterId,
          modalityIds: selected.map((s) => s.id),
        }),
      }),
    onSuccess: () => {
      toast.success("Imaging order placed");
      onDone();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Order failed"),
  });

  return (
    <form
      className="space-y-2 rounded-md border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.length === 0) {
          toast.error("Select at least one study");
          return;
        }
        mutation.mutate();
      }}
    >
      <Label htmlFor="rad-q">Search imaging modalities</Label>
      <Input
        id="rad-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="X-Ray, CT, MRI…"
      />
      <ul className="max-h-40 overflow-auto rounded-md border border-border text-sm">
        {matches.map((m) => {
          const on = selected.some((s) => s.id === m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col px-2 py-1.5 text-left hover:bg-accent",
                  on && "bg-primary/10 text-primary",
                )}
                onClick={() =>
                  setSelected((prev) =>
                    on ? prev.filter((s) => s.id !== m.id) : [...prev, m],
                  )
                }
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">
                  {m.code} · ${(m.priceCents / 100).toFixed(0)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected.length > 0 ? (
        <p className="text-xs text-muted-foreground">{selected.length} selected</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        Place imaging order
      </Button>
    </form>
  );
}
