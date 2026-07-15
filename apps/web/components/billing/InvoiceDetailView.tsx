"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { formatCents, type InvoiceDetail } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentModal } from "./PaymentModal";
import { VoidInvoiceDialog } from "./VoidInvoiceDialog";
import { InlineLoader } from "@/components/shared/InlineLoader";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type InvoiceDetailViewProps = {
  invoiceId: string;
  canPay?: boolean;
  canVoid?: boolean;
  canClaim?: boolean;
  readOnlyNote?: string;
};

export function InvoiceDetailView({
  invoiceId,
  canPay = false,
  canVoid = false,
  canClaim = false,
  readOnlyNote,
}: InvoiceDetailViewProps) {
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [policyNo, setPolicyNo] = useState("");
  const [claimDollars, setClaimDollars] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["billing-invoice", invoiceId],
    queryFn: () =>
      apiFetch<{ data: InvoiceDetail }>(`/api/billing/invoices/${invoiceId}`),
  });

  const invoice = data?.data;
  const paid = useMemo(
    () => invoice?.payments.reduce((s, p) => s + p.amountCents, 0) ?? 0,
    [invoice],
  );
  const balance = invoice ? Math.max(0, invoice.totalCents - paid) : 0;

  async function submitClaim() {
    await apiFetch(`/api/billing/invoices/${invoiceId}/claims`, {
      method: "POST",
      body: JSON.stringify({
        provider: provider.trim(),
        policyNo: policyNo.trim(),
        claimedCents: Math.round(parseFloat(claimDollars || "0") * 100),
      }),
    });
    setProvider("");
    setPolicyNo("");
    setClaimDollars("");
    await refetch();
  }

  if (isLoading) {
    return <InlineLoader label="Loading invoice…" />;
  }
  if (error || !invoice) {
    return (
      <QueryErrorState
        error={error ?? new Error("Invoice not found")}
        onRetry={() => void refetch()}
        title="Couldn’t load invoice"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Invoice #{invoice.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invoice.patient.lastName}, {invoice.patient.firstName} ·{" "}
            {invoice.patient.mrn} · {format(new Date(invoice.createdAt), "MMM d, yyyy")}
          </p>
          <p
            className={cn(
              "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
              invoice.status === "PAID" && "bg-success/15 text-success",
              invoice.status === "VOID" && "bg-destructive/10 text-destructive",
              invoice.status === "PARTIALLY_PAID" && "bg-warning/15",
              (invoice.status === "DRAFT" || invoice.status === "ISSUED") &&
                "bg-primary/10 text-primary",
            )}
          >
            {invoice.status.replaceAll("_", " ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const res = await fetch(`${API}/api/billing/invoices/${invoiceId}/pdf`, {
                  credentials: "include",
                });
                if (!res.ok) throw new Error("PDF download failed");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `invoice-${invoiceId.slice(0, 8)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                /* toast handled by caller context if needed */
              }
            }}
          >
            Download PDF
          </Button>
          {canPay && invoice.status !== "VOID" && invoice.status !== "PAID" ? (
            <Button size="sm" onClick={() => setPayOpen(true)}>
              Record payment
            </Button>
          ) : null}
          {canVoid && invoice.status !== "VOID" ? (
            <Button size="sm" variant="destructive" onClick={() => setVoidOpen(true)}>
              Void
            </Button>
          ) : null}
        </div>
      </div>

      {readOnlyNote ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          {readOnlyNote}
        </p>
      ) : null}

      {invoice.voidReason ? (
        <p className="text-sm text-destructive">Void reason: {invoice.voidReason}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {invoice.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sourceType} · qty {item.quantity} ×{" "}
                    {formatCents(item.unitPriceCents)}
                  </p>
                </div>
                <p className="font-medium">{formatCents(item.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCents(invoice.subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCents(invoice.taxCents)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCents(invoice.totalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{formatCents(paid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance</span>
              <span>{formatCents(balance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span>
                    {p.method} · {format(new Date(p.paidAt), "MMM d, yyyy HH:mm")}
                    {p.transactionRef ? ` · ${p.transactionRef}` : ""}
                  </span>
                  <span className="font-medium">{formatCents(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {(canClaim || invoice.claims.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insurance claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.claims.length === 0 ? (
              <p className="text-sm text-muted-foreground">No claims submitted.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {invoice.claims.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>
                      {c.provider} · {c.policyNo} · {c.status}
                    </span>
                    <span>{formatCents(c.claimedCents)}</span>
                  </li>
                ))}
              </ul>
            )}
            {canClaim && invoice.status !== "VOID" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="Provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                />
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="Policy #"
                  value={policyNo}
                  onChange={(e) => setPolicyNo(e.target.value)}
                />
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="Claim amount USD"
                  value={claimDollars}
                  onChange={(e) => setClaimDollars(e.target.value)}
                />
                <Button
                  type="button"
                  className="sm:col-span-3"
                  disabled={!provider.trim() || !policyNo.trim()}
                  onClick={() => void submitClaim().catch(() => undefined)}
                >
                  Submit claim
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <PaymentModal
        invoiceId={invoiceId}
        balanceCents={balance || invoice.totalCents}
        open={payOpen}
        onOpenChange={setPayOpen}
      />
      <VoidInvoiceDialog
        invoiceId={invoiceId}
        open={voidOpen}
        onOpenChange={setVoidOpen}
      />
    </div>
  );
}
