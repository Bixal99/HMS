"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toWords } from "number-to-words";
import { apiFetch, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] w-[min(28rem,94vw)] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Record payment</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-6">
          <p className="text-sm text-muted-foreground">
            Balance due: {formatCents(balanceCents)}
          </p>
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

          {!confirming ? (
            <Button
              type="button"
              className="w-full"
              disabled={amountCents < 1}
              onClick={() => setConfirming(true)}
            >
              Continue
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-3">
              <p className="text-sm text-foreground">
                Confirm payment of{" "}
                <strong>{formatCents(amountCents)}</strong>
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={mutation.isPending}
                aria-label={`Confirm payment of ${words} dollars`}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Recording…" : "Confirm payment"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setConfirming(false)}
              >
                Back
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
