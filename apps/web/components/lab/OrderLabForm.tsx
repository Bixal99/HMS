"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CatalogTest = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  sampleType: string;
  turnaroundHours: number;
  resultType: string;
};

export function OrderLabForm({
  encounterId,
  onDone,
}: {
  encounterId: string;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<CatalogTest[]>([]);

  const { data } = useQuery({
    queryKey: ["lab-catalog"],
    queryFn: () => apiFetch<{ data: CatalogTest[] }>("/api/lab/catalog"),
  });

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data?.data ?? [];
    if (!needle) return list.slice(0, 12);
    return list
      .filter(
        (t) =>
          t.name.toLowerCase().includes(needle) ||
          t.category.toLowerCase().includes(needle),
      )
      .slice(0, 12);
  }, [data, q]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/lab/orders", {
        method: "POST",
        body: JSON.stringify({
          encounterId,
          testIds: selected.map((s) => s.id),
        }),
      }),
    onSuccess: () => {
      toast.success("Lab order placed");
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
          toast.error("Select at least one test");
          return;
        }
        mutation.mutate();
      }}
    >
      <Label htmlFor="lab-q">Search lab tests</Label>
      <Input
        id="lab-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="CBC, potassium, glucose…"
      />
      <ul className="max-h-40 overflow-auto rounded-md border border-border text-sm">
        {matches.map((t) => {
          const on = selected.some((s) => s.id === t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col px-2 py-1.5 text-left hover:bg-accent",
                  on && "bg-primary/10 text-primary",
                )}
                onClick={() =>
                  setSelected((prev) =>
                    on ? prev.filter((s) => s.id !== t.id) : [...prev, t],
                  )
                }
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t.category} · {t.sampleType} · {t.turnaroundHours}h · Rs{" "}
                  {(t.priceCents / 100).toFixed(0)}
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
        Place lab order
      </Button>
    </form>
  );
}
