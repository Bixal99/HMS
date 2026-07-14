import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { RoleHomeDashboard, RoleIcons } from "@/components/dashboard/RoleHomeDashboard";
import { loadRoleDashboardCounts } from "@/lib/dashboard-counts";
import {
  pharmacyDispenseByDaySeries,
  pharmacyQueueSeries,
  pharmacyRxStatusSeries,
  queueVsAlertsSeries,
} from "@/lib/role-dashboard-series";
import { requireDashboardRole } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function PharmacyDashboardPage() {
  const user = await requireSessionUser();
  requireDashboardRole(user, "PHARMACIST");

  const counts = await loadRoleDashboardCounts("PHARMACIST");
  const queue = counts.pharmacyQueue ?? 0;
  const alerts = counts.pharmacyAlerts ?? 0;

  const [pipeline, dispenses, alertMix, rxStatus] = await Promise.all([
    pharmacyQueueSeries(),
    pharmacyDispenseByDaySeries(),
    Promise.resolve(queueVsAlertsSeries(queue, alerts)),
    pharmacyRxStatusSeries(),
  ]);

  return (
    <AuthenticatedShell>
      <PageEnter>
        <RoleHomeDashboard
          title="Pharmacy dashboard"
          description="Fulfill prescriptions, receive purchase orders, and watch stock alerts."
          heroTitle="Dispense with confidence"
          heroBody="Clear the fulfillment queue first, then reconcile purchase orders and stock alerts."
          kpis={[
            {
              label: "Fulfillment queue",
              value: queue,
              icon: RoleIcons.Pill,
              tone: queue > 0 ? "warning" : "success",
            },
            {
              label: "Stock alerts",
              value: alerts,
              icon: RoleIcons.AlertTriangle,
              tone: alerts > 0 ? "danger" : "success",
            },
            {
              label: "Purchase orders",
              value: "—",
              icon: RoleIcons.ShoppingCart,
              hint: "Receive stock",
            },
            {
              label: "Priority load",
              value: queue + alerts,
              icon: RoleIcons.ClipboardList,
              hint: "Queue + alerts",
            },
          ]}
          charts={[
            pipeline,
            dispenses,
            { ...alertMix, title: "Queue vs stock alerts", palette: "amber" },
            rxStatus,
          ]}
          actions={[
            {
              href: "/pharmacy/queue",
              label: "Fulfillment queue",
              variant: "default",
              icon: RoleIcons.Pill,
            },
            {
              href: "/pharmacy/purchase-orders",
              label: "Purchase orders",
              icon: RoleIcons.ShoppingCart,
            },
            {
              href: "/pharmacy/alerts",
              label: "Alerts",
              icon: RoleIcons.AlertTriangle,
            },
            { href: "/staff/availability", label: "My availability" },
          ]}
        />
      </PageEnter>
    </AuthenticatedShell>
  );
}
