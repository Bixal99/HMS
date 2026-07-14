"use client";

import { useEffect } from "react";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

type UrgentPayload = {
  appointmentId: string;
  doctorId: string;
  scheduledAt: string;
  patientName: string;
  categoryName: string;
};

/**
 * Live toast when a patient books with an urgent (red-flag) intake.
 * Mounted for doctor / receptionist / admin shells.
 */
export function UrgentIntakeAlertListener({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const socket: Socket = io(API_BASE, { withCredentials: true });
    socket.on("intake:urgent", (payload: UrgentPayload) => {
      toast.warning(
        `Urgent intake: ${payload.patientName} · ${payload.categoryName}`,
        {
          description: "Open today’s queue to review and check in.",
          action: {
            label: "Open queue",
            onClick: () => {
              window.location.href = "/appointments/queue";
            },
          },
          duration: 12_000,
        },
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);

  return null;
}

/** Optional link helper for SSR-free toast action environments */
export function QueueToastLink() {
  return (
    <Link href="/appointments/queue" className="underline">
      Today&apos;s queue
    </Link>
  );
}
