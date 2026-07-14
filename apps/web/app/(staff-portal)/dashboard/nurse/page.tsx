import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { RoleHomeDashboard, RoleIcons } from "@/components/dashboard/RoleHomeDashboard";
import { loadRoleDashboardCounts } from "@/lib/dashboard-counts";
import {
  activeAdmissionsSeries,
  bedOccupancySeries,
  bedsByWardSeries,
  inventoryAlertSeries,
} from "@/lib/role-dashboard-series";
import { requireDashboardRole } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function NurseDashboardPage() {
  const user = await requireSessionUser();
  requireDashboardRole(user, "NURSE");

  const counts = await loadRoleDashboardCounts("NURSE");
  const queue = counts.todayQueue ?? 0;
  const occupied = counts.occupiedBeds ?? 0;
  const available = counts.availableBeds ?? 0;
  const inventoryAlerts = counts.inventoryAlerts ?? 0;

  const [byWard, beds, inventory, census] = await Promise.all([
    bedsByWardSeries(),
    bedOccupancySeries(),
    inventoryAlertSeries(inventoryAlerts),
    activeAdmissionsSeries(),
  ]);

  return (
    <AuthenticatedShell>
      <PageEnter>
        <RoleHomeDashboard
          title="Nurse dashboard"
          description="Check patients in, manage ward beds, and watch inventory alerts."
          heroTitle="Floor readiness"
          heroBody="Use the live queue for intake, the nursing board for MAR and care plans, and inventory alerts before they block care."
          kpis={[
            {
              label: "Today's queue",
              value: queue,
              icon: RoleIcons.ClipboardList,
            },
            {
              label: "Occupied beds",
              value: occupied,
              icon: RoleIcons.BedDouble,
            },
            {
              label: "Available beds",
              value: available,
              icon: RoleIcons.BedDouble,
              tone: "success",
            },
            {
              label: "Inventory alerts",
              value: inventoryAlerts,
              icon: RoleIcons.AlertTriangle,
              tone: inventoryAlerts > 0 ? "danger" : "success",
            },
          ]}
          charts={[byWard, beds, inventory, census]}
          actions={[
            {
              href: "/appointments/queue",
              label: "Today's queue",
              variant: "default",
              icon: RoleIcons.ClipboardList,
            },
            { href: "/wards", label: "Ward occupancy", icon: RoleIcons.BedDouble },
            { href: "/wards/nursing", label: "Nursing board" },
            {
              href: "/inventory/alerts",
              label: "Inventory alerts",
              icon: RoleIcons.AlertTriangle,
            },
            { href: "/inventory", label: "Inventory", icon: RoleIcons.Package },
          ]}
        />
      </PageEnter>
    </AuthenticatedShell>
  );
}
