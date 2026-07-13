"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";

type CriticalPayload = {
  labOrderItemId: string;
  labOrderId: string;
  testName: string;
  patientId: string;
  value: string | number;
};

/**
 * Non-dismissible critical lab alert for ordering doctors.
 * Backdrop click and Escape do not close — only Acknowledge.
 */
export function CriticalLabAlertListener({ enabled }: { enabled: boolean }) {
  const [alert, setAlert] = useState<CriticalPayload | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const socket: Socket = io(API_BASE, { withCredentials: true });
    socket.on("lab:critical_result", (payload: CriticalPayload) => {
      setAlert(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);

  useEffect(() => {
    if (!alert) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [alert]);

  if (!alert) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-lab-title"
      // No onClick on backdrop — acknowledgment only
    >
      <div className="max-w-md rounded-lg border-2 border-destructive bg-card p-6 shadow-xl">
        <h2 id="critical-lab-title" className="text-lg font-semibold text-destructive">
          Critical lab result
        </h2>
        <p className="mt-3 text-sm text-foreground" role="alert">
          <strong>{alert.testName}</strong> returned a critical value:{" "}
          <strong>{String(alert.value)}</strong>. Review the patient chart immediately.
        </p>
        <div className="mt-5 flex justify-end">
          <Button type="button" variant="destructive" onClick={() => setAlert(null)}>
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
}
