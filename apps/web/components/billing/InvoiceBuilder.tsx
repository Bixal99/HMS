"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { formatCents, type InvoiceDetail } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PatientOption = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
};

export function InvoiceBuilder() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [draft, setDraft] = useState<InvoiceDetail | null>(null);
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [unitDollars, setUnitDollars] = useState("0.00");

  const patientsQuery = useQuery({
    queryKey: ["patients-billing-picker", search],
    queryFn: () =>
      apiFetch<{ data: PatientOption[] }>(
        `/api/patients?q=${encodeURIComponent(search)}&pageSize=8`,
      ),
    enabled: search.trim().length >= 2,
  });

  const generate = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: InvoiceDetail }>(`/api/billing/invoices/generate/${id}`, {
        method: "POST",
      }),
    onSuccess: (res) => {
      toast.success("Invoice generated");
      setDraft(res.data);
      setPatientId(res.data.patientId);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Generate failed");
    },
  });

  const addItem = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("No draft");
      return apiFetch<{ data: InvoiceDetail }>(
        `/api/billing/invoices/${draft.id}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            description: desc.trim(),
            quantity: Math.max(1, parseInt(qty, 10) || 1),
            unitPriceCents: Math.round(parseFloat(unitDollars || "0") * 100),
          }),
        },
      );
    },
    onSuccess: (res) => {
      setDraft(res.data);
      setDesc("");
      setQty("1");
      setUnitDollars("0.00");
      toast.success("Line item added");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not add item");
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <Card>
        <CardHeader>
          <CardTitle>Generate from patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient-search">Search patient</Label>
            <Input
              id="patient-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, MRN, or phone"
            />
          </div>
          {patientsQuery.data?.data?.length ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {patientsQuery.data.data.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {p.lastName}, {p.firstName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{p.mrn}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={generate.isPending}
                    onClick={() => {
                      setPatientId(p.id);
                      generate.mutate(p.id);
                    }}
                  >
                    Generate
                  </Button>
                </li>
              ))}
            </ul>
          ) : search.trim().length >= 2 && !patientsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">No patients found.</p>
          ) : null}

          {draft && draft.status !== "VOID" && draft.status !== "PAID" ? (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">Add manual line</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-3">
                  <Label htmlFor="item-desc">Description</Label>
                  <Input
                    id="item-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="item-qty">Qty</Label>
                  <Input
                    id="item-qty"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="item-unit">Unit price (USD)</Label>
                  <Input
                    id="item-unit"
                    type="number"
                    min={0}
                    step="0.01"
                    value={unitDollars}
                    onChange={(e) => setUnitDollars(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!desc.trim() || addItem.isPending}
                onClick={() => addItem.mutate()}
              >
                Add to invoice
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Receipt preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!draft ? (
            <p className="text-muted-foreground">
              Generated line items will appear here.
              {patientId ? null : null}
            </p>
          ) : (
            <>
              <p className="font-medium text-foreground">
                {draft.patient.lastName}, {draft.patient.firstName}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                #{draft.id.slice(0, 8)} · {draft.status}
              </p>
              <ul className="space-y-2 border-y border-border py-3">
                {draft.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {item.description}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatCents(item.lineTotalCents)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCents(draft.totalCents)}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => router.push(`/billing/${draft.id}`)}
              >
                Open invoice
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
