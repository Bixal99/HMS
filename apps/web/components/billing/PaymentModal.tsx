"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { toWords } from "number-to-words";
import { apiFetch, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/billing";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentModalProps = {
  invoiceId: string;
  balanceCents: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PaymentModal({
  invoiceId,
  balanceCents,
  open,
  onOpenChange,
}: PaymentModalProps) {
  const qc = useQueryClient();
  const [amountDollars, setAmountDollars] = useState(
    (balanceCents / 100).toFixed(2),
  );
  const [method, setMethod] = useState("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [confirming, setConfirming] = useState(false);

  const amountCents = Math.round(parseFloat(amountDollars || "0") * 100);
  const words =
    amountCents > 0
      ? toWords(Math.floor(amountCents / 100)).replace(/-/g, " ")
      : "zero";

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/billing/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          method,
          amountCents,
          transactionRef: transactionRef.trim() || null,
        }),
      }),
    onSuccess: async () => {
      toast.success("Payment recorded");
      await qc.invalidateQueries({ queryKey: ["billing-invoice", invoiceId] });
      await qc.invalidateQueries({ queryKey: ["billing-invoices"] });
      setConfirming(false);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Payment failed");
    },
  });

  return (
    <ActionDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={Wallet}
      title="Record payment"
      description={`Balance due: ${formatCents(balanceCents)}`}
      footer={
        !confirming ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={amountCents < 1}
              onClick={() => setConfirming(true)}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirming(false)}
              disabled={mutation.isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={mutation.isPending}
              aria-label={`Confirm payment of ${words} dollars`}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Recording…" : "Confirm payment"}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-2">
        <Label htmlFor="pay-amount">Amount (USD)</Label>
        <Input
          id="pay-amount"
          type="number"
          min={0.01}
          step="0.01"
          value={amountDollars}
          onChange={(e) => {
            setAmountDollars(e.target.value);
            setConfirming(false);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pay-method">Method</Label>
        <select
          id="pay-method"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
          <option value="INSURANCE">Insurance</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pay-ref">Reference (optional)</Label>
        <Input
          id="pay-ref"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
        />
      </div>
      {confirming ? (
        <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-foreground">
          Confirm payment of <strong>{formatCents(amountCents)}</strong>
        </p>
      ) : null}
    </ActionDrawer>
  );
}
