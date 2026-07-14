import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { RoleHomeDashboard, RoleIcons } from "@/components/dashboard/RoleHomeDashboard";
import { loadRoleDashboardCounts } from "@/lib/dashboard-counts";
import {
  equipmentStatusSeries,
  labOrdersByStatusSeries,
  labVsImagingSeries,
  radiologyByDaySeries,
} from "@/lib/role-dashboard-series";
import { requireDashboardRole } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function LabDashboardPage() {
  const user = await requireSessionUser();
  requireDashboardRole(user, "LAB_TECHNICIAN");

  const counts = await loadRoleDashboardCounts("LAB_TECHNICIAN");
  const labQueue = counts.labQueue ?? 0;
  const imagingQueue = counts.radiologyQueue ?? 0;
  const inventoryAlerts = counts.inventoryAlerts ?? 0;

  const [labVsImg, labStatus, imagingTrend, equipment] = await Promise.all([
    labVsImagingSeries(labQueue, imagingQueue),
    labOrdersByStatusSeries(),
    radiologyByDaySeries(),
    equipmentStatusSeries(),
  ]);

  return (
    <AuthenticatedShell>
      <PageEnter>
        <RoleHomeDashboard
          title="Lab dashboard"
          description="Process ordered tests, enter results, and flag critical values."
          heroTitle="Specimen to result"
          heroBody="Work lab and imaging queues in priority order, and keep equipment and inventory ready."
          kpis={[
            {
              label: "Lab queue",
              value: labQueue,
              icon: RoleIcons.FlaskConical,
              tone: labQueue > 0 ? "warning" : "success",
            },
            {
              label: "Imaging queue",
              value: imagingQueue,
              icon: RoleIcons.Scan,
              tone: imagingQueue > 0 ? "warning" : "success",
            },
            {
              label: "Inventory alerts",
              value: inventoryAlerts,
              icon: RoleIcons.AlertTriangle,
              tone: inventoryAlerts > 0 ? "danger" : "success",
            },
            {
              label: "Open work",
              value: labQueue + imagingQueue,
              icon: RoleIcons.ClipboardList,
              hint: "Lab + imaging",
            },
          ]}
          charts={[labVsImg, labStatus, imagingTrend, equipment]}
          actions={[
            {
              href: "/lab/queue",
              label: "Open lab queue",
              variant: "default",
              icon: RoleIcons.FlaskConical,
            },
            {
              href: "/radiology/queue",
              label: "Imaging queue",
              icon: RoleIcons.Scan,
            },
            {
              href: "/inventory/equipment",
              label: "Equipment",
            },
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
