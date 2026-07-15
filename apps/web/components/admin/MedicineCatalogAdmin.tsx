"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Medicine = {
  id: string;
  name: string;
  genericName: string | null;
  form: string;
  strength: string;
  reorderThreshold: number;
  sellingPriceCents: number;
};

type FormState = {
  name: string;
  genericName: string;
  form: string;
  strength: string;
  reorderThreshold: string;
  sellingPriceCents: string;
};

const empty: FormState = {
  name: "",
  genericName: "",
  form: "",
  strength: "",
  reorderThreshold: "10",
  sellingPriceCents: "0",
};

export function MedicineCatalogAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<(FormState & { id: string }) | null>(
    null,
  );

  const { data } = useQuery({
    queryKey: ["pharmacy-medicines"],
    queryFn: () => apiFetch<{ data: Medicine[] }>("/api/pharmacy/medicines"),
  });
  const medicines = data?.data ?? [];

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/pharmacy/medicines", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          genericName: form.genericName || null,
          form: form.form,
          strength: form.strength,
          reorderThreshold: Number(form.reorderThreshold),
          sellingPriceCents: Number(form.sellingPriceCents),
        }),
      }),
    onSuccess: async () => {
      toast.success("Medicine created");
      setForm(empty);
      await qc.invalidateQueries({ queryKey: ["pharmacy-medicines"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create failed"),
  });

  const update = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("No medicine");
      return apiFetch(`/api/pharmacy/medicines/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editing.name,
          genericName: editing.genericName || null,
          form: editing.form,
          strength: editing.strength,
          reorderThreshold: Number(editing.reorderThreshold),
          sellingPriceCents: Number(editing.sellingPriceCents),
        }),
      });
    },
    onSuccess: async () => {
      toast.success("Medicine updated");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["pharmacy-medicines"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Update failed"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Medicine Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Catalog only — receive stock via purchase orders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add medicine</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["name", "Name"],
              ["genericName", "Generic name"],
              ["form", "Form"],
              ["strength", "Strength"],
              ["reorderThreshold", "Reorder threshold"],
              ["sellingPriceCents", "Selling price (cents)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`m-${key}`}>{label}</Label>
              <Input
                id={`m-${key}`}
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            className="sm:col-span-3"
            disabled={!form.name || !form.form || create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </CardContent>
      </Card>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {medicines.map((m) => (
          <li key={m.id} className="space-y-2 px-4 py-3 text-sm">
            {editing?.id === m.id ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["name", "Name"],
                    ["genericName", "Generic"],
                    ["form", "Form"],
                    ["strength", "Strength"],
                    ["reorderThreshold", "Reorder"],
                    ["sellingPriceCents", "Price cents"],
                  ] as const
                ).map(([key, label]) => (
                  <Input
                    key={key}
                    aria-label={label}
                    value={editing[key]}
                    onChange={(e) =>
                      setEditing((cur) =>
                        cur ? { ...cur, [key]: e.target.value } : cur,
                      )
                    }
                  />
                ))}
                <div className="flex gap-2 sm:col-span-3">
                  <Button
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => update.mutate()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {m.name}{" "}
                    <span className="text-muted-foreground">
                      · {m.form} {m.strength}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {m.genericName ? `${m.genericName} · ` : ""}
                    {(m.sellingPriceCents / 100).toFixed(2)} · reorder{" "}
                    {m.reorderThreshold}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      id: m.id,
                      name: m.name,
                      genericName: m.genericName ?? "",
                      form: m.form,
                      strength: m.strength,
                      reorderThreshold: String(m.reorderThreshold),
                      sellingPriceCents: String(m.sellingPriceCents),
                    })
                  }
                >
                  Edit
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
