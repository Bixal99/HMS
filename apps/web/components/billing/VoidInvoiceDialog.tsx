"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VoidInvoiceDialogProps = {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VoidInvoiceDialog({
  invoiceId,
  open,
  onOpenChange,
}: VoidInvoiceDialogProps) {
  const qc = useQueryClient();
  const [voidReason, setVoidReason] = useState("");
  const canSubmit = voidReason.trim().length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/billing/invoices/${invoiceId}/void`, {
        method: "PATCH",
        body: JSON.stringify({ voidReason: voidReason.trim() }),
      }),
    onSuccess: async () => {
      toast.success("Invoice voided");
      await qc.invalidateQueries({ queryKey: ["billing-invoice", invoiceId] });
      await qc.invalidateQueries({ queryKey: ["billing-invoices"] });
      setVoidReason("");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Void failed");
    },
  });

  return (
    <ActionDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={Ban}
      title="Void invoice"
      description="Voiding keeps source charges marked as billed. A reason is required."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Voiding…" : "Void invoice"}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="void-reason">Reason</Label>
        <Input
          id="void-reason"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          placeholder="e.g. Duplicate invoice created in error"
        />
      </div>
    </ActionDrawer>
  );
}
