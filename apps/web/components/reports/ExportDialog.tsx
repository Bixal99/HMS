"use client";

import { useState } from "react";
import { toast } from "sonner";
import { API_BASE, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ActionDrawer } from "@/components/shared/ActionDrawer";

type ExportDialogProps = {
  reportType: "operational" | "financial" | "clinical";
  start: string;
  end: string;
};

export function ExportDialog({ reportType, start, end }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"csv" | "pdf" | null>(null);

  async function download(format: "csv" | "pdf") {
    setPending(format);
    try {
      const res = await fetch(`${API_BASE}/api/reports/export`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, format, start, end }),
      });
      if (!res.ok) {
        let message = res.statusText;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // ignore
        }
        throw new ApiError(res.status, message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-report.${format}`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Export failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        suppressHydrationWarning
        onClick={() => setOpen(true)}
      >
        Export
      </Button>
      <ActionDrawer
        open={open}
        onOpenChange={setOpen}
        title={`Export ${reportType} report`}
        widthClass="w-[min(24rem,94vw)]"
        footer={
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setOpen(false)}
            disabled={pending !== null}
          >
            Cancel
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          Downloads the current date range ({start} → {end}) and records a
          snapshot.
        </p>
        <Button
          type="button"
          className="w-full"
          disabled={pending !== null}
          suppressHydrationWarning
          onClick={() => void download("csv")}
        >
          {pending === "csv" ? "Preparing…" : "Download CSV"}
        </Button>
        <Button
          type="button"
          className="w-full"
          variant="outline"
          disabled={pending !== null}
          suppressHydrationWarning
          onClick={() => void download("pdf")}
        >
          {pending === "pdf" ? "Preparing…" : "Download PDF"}
        </Button>
      </ActionDrawer>
    </>
  );
}
