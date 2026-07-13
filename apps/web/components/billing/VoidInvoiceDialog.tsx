"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] w-[min(28rem,94vw)] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Void invoice</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-6">
          <p className="text-sm text-muted-foreground">
            Voiding keeps source charges marked as billed. A reason is required.
          </p>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Input
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Duplicate invoice created in error"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Voiding…" : "Void invoice"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
