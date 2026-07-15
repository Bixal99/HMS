"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CatalogEntry = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  sampleType: string;
  turnaroundHours: number;
  resultType: "NUMERIC" | "TEXT" | "FILE";
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  criticalLow: number | null;
  criticalHigh: number | null;
};

type FormState = {
  name: string;
  category: string;
  priceCents: string;
  sampleType: string;
  turnaroundHours: string;
  resultType: "NUMERIC" | "TEXT" | "FILE";
  unit: string;
  referenceLow: string;
  referenceHigh: string;
  criticalLow: string;
  criticalHigh: string;
};

const empty: FormState = {
  name: "",
  category: "",
  priceCents: "0",
  sampleType: "",
  turnaroundHours: "24",
  resultType: "NUMERIC",
  unit: "",
  referenceLow: "",
  referenceHigh: "",
  criticalLow: "",
  criticalHigh: "",
};

function toPayload(form: FormState) {
  const base = {
    name: form.name,
    category: form.category,
    priceCents: Number(form.priceCents),
    sampleType: form.sampleType,
    turnaroundHours: Number(form.turnaroundHours),
    resultType: form.resultType,
  };
  if (form.resultType !== "NUMERIC") {
    return {
      ...base,
      unit: null,
      referenceLow: null,
      referenceHigh: null,
      criticalLow: null,
      criticalHigh: null,
    };
  }
  return {
    ...base,
    unit: form.unit || null,
    referenceLow: form.referenceLow ? Number(form.referenceLow) : null,
    referenceHigh: form.referenceHigh ? Number(form.referenceHigh) : null,
    criticalLow: form.criticalLow ? Number(form.criticalLow) : null,
    criticalHigh: form.criticalHigh ? Number(form.criticalHigh) : null,
  };
}

export function LabCatalogAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<(FormState & { id: string }) | null>(
    null,
  );

  const { data } = useQuery({
    queryKey: ["lab-catalog"],
    queryFn: () => apiFetch<{ data: CatalogEntry[] }>("/api/lab/catalog"),
  });
  const entries = data?.data ?? [];

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/lab/catalog", {
        method: "POST",
        body: JSON.stringify(toPayload(form)),
      }),
    onSuccess: async () => {
      toast.success("Test catalog entry created");
      setForm(empty);
      await qc.invalidateQueries({ queryKey: ["lab-catalog"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create failed"),
  });

  const update = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("No entry");
      return apiFetch(`/api/lab/catalog/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(toPayload(editing)),
      });
    },
    onSuccess: async () => {
      toast.success("Catalog entry updated");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["lab-catalog"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Update failed"),
  });

  function FormFields({
    value,
    onChange,
  }: {
    value: FormState;
    onChange: (next: FormState) => void;
  }) {
    return (
      <>
        <div className="space-y-1">
          <Label>Name</Label>
          <Input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Category (use &quot;Imaging&quot; for imaging services)</Label>
          <Input
            value={value.category}
            onChange={(e) => onChange({ ...value, category: e.target.value })}
            placeholder="Hematology / Imaging / …"
          />
        </div>
        <div className="space-y-1">
          <Label>Result type</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={value.resultType}
            onChange={(e) =>
              onChange({
                ...value,
                resultType: e.target.value as FormState["resultType"],
              })
            }
          >
            <option value="NUMERIC">NUMERIC</option>
            <option value="TEXT">TEXT</option>
            <option value="FILE">FILE (imaging / attachments)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Price (cents)</Label>
          <Input
            type="number"
            value={value.priceCents}
            onChange={(e) => onChange({ ...value, priceCents: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Sample type</Label>
          <Input
            value={value.sampleType}
            onChange={(e) => onChange({ ...value, sampleType: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Turnaround (hours)</Label>
          <Input
            type="number"
            value={value.turnaroundHours}
            onChange={(e) =>
              onChange({ ...value, turnaroundHours: e.target.value })
            }
          />
        </div>
        {value.resultType === "NUMERIC" ? (
          <>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input
                value={value.unit}
                onChange={(e) => onChange({ ...value, unit: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Reference low</Label>
              <Input
                value={value.referenceLow}
                onChange={(e) =>
                  onChange({ ...value, referenceLow: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Reference high</Label>
              <Input
                value={value.referenceHigh}
                onChange={(e) =>
                  onChange({ ...value, referenceHigh: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Critical low</Label>
              <Input
                value={value.criticalLow}
                onChange={(e) =>
                  onChange({ ...value, criticalLow: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Critical high</Label>
              <Input
                value={value.criticalHigh}
                onChange={(e) =>
                  onChange({ ...value, criticalHigh: e.target.value })
                }
              />
            </div>
          </>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Lab &amp; Imaging Test Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Imaging is a catalog entry with category &quot;Imaging&quot; and result
          type FILE — no separate imaging model.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add catalog entry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <FormFields value={form} onChange={setForm} />
          <Button
            type="button"
            className="sm:col-span-2"
            disabled={!form.name || create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </CardContent>
      </Card>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {entries.map((entry) => (
          <li key={entry.id} className="space-y-2 px-4 py-3 text-sm">
            {editing?.id === entry.id ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <FormFields
                  value={editing}
                  onChange={(next) => setEditing({ ...next, id: entry.id })}
                />
                <div className="flex gap-2 sm:col-span-2">
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
                    {entry.name}{" "}
                    <span className="text-muted-foreground">
                      · {entry.category} · {entry.resultType}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {(entry.priceCents / 100).toFixed(2)} · {entry.sampleType} ·{" "}
                    {entry.turnaroundHours}h
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      id: entry.id,
                      name: entry.name,
                      category: entry.category,
                      priceCents: String(entry.priceCents),
                      sampleType: entry.sampleType,
                      turnaroundHours: String(entry.turnaroundHours),
                      resultType: entry.resultType,
                      unit: entry.unit ?? "",
                      referenceLow:
                        entry.referenceLow != null
                          ? String(entry.referenceLow)
                          : "",
                      referenceHigh:
                        entry.referenceHigh != null
                          ? String(entry.referenceHigh)
                          : "",
                      criticalLow:
                        entry.criticalLow != null
                          ? String(entry.criticalLow)
                          : "",
                      criticalHigh:
                        entry.criticalHigh != null
                          ? String(entry.criticalHigh)
                          : "",
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
