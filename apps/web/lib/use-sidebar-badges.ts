"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { BadgeCounts } from "@/lib/sidebar-config";

async function fetchCount(path: string): Promise<number> {
  try {
    const body = await apiFetch<{ count: number }>(path);
    return body.count ?? 0;
  } catch {
    return 0;
  }
}

async function loadSidebarBadges(role: string): Promise<BadgeCounts> {
  const next: BadgeCounts = {};
  const tasks: Array<Promise<void>> = [];

  if (role === "ADMIN") {
    tasks.push(
      fetchCount("/api/staff/leave-requests/pending-count").then((n) => {
        next.leavePending = n;
      }),
    );
  }
  if (["PHARMACIST", "ADMIN"].includes(role)) {
    tasks.push(
      fetchCount("/api/pharmacy/alerts/count").then((n) => {
        next.pharmacyAlerts = n;
      }),
      fetchCount("/api/pharmacy/queue/count").then((n) => {
        next.pharmacyQueue = n;
      }),
    );
  }
  if (["LAB_TECHNICIAN", "ADMIN"].includes(role)) {
    tasks.push(
      fetchCount("/api/lab/orders/queue/count").then((n) => {
        next.labQueue = n;
      }),
      fetchCount("/api/radiology/orders/queue/count").then((n) => {
        next.radiologyQueue = n;
      }),
    );
  }
  if (["BILLING_OFFICER", "ADMIN"].includes(role)) {
    tasks.push(
      fetchCount("/api/billing/alerts/count").then((n) => {
        next.billingAlerts = n;
      }),
    );
  }
  if (role === "PATIENT") {
    tasks.push(
      fetchCount("/api/billing/invoices/mine/unpaid-count").then((n) => {
        next.patientUnpaid = n;
      }),
    );
  }
  if (["ADMIN", "NURSE", "LAB_TECHNICIAN"].includes(role)) {
    tasks.push(
      fetchCount("/api/inventory/alerts/count").then((n) => {
        next.inventoryAlerts = n;
      }),
    );
  }
  if (["ADMIN", "RECEPTIONIST"].includes(role)) {
    tasks.push(
      fetchCount("/api/appointments/pending/counts").then((n) => {
        next.appointmentPending = n;
      }),
    );
  }

  await Promise.all(tasks);
  return next;
}

/**
 * Loads sidebar badge counts on the client after paint so PortalShell does not
 * block every navigation on 8+ round trips. Cached for 30s via React Query.
 */
export function useSidebarBadges(role: string): BadgeCounts {
  const { data } = useQuery({
    queryKey: ["sidebar-badges", role],
    queryFn: () => loadSidebarBadges(role),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  return data ?? {};
}
