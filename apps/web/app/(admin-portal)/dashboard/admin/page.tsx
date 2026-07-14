import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { AdminOperationsDashboard } from "@/components/dashboard/AdminOperationsDashboard";
import { loadRoleDashboardCounts } from "@/lib/dashboard-counts";
import { bedOccupancySeries } from "@/lib/role-dashboard-series";
import { requireDashboardRole } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function AdminDashboardPage() {
  const user = await requireSessionUser();
  requireDashboardRole(user, "ADMIN");

  const [counts, bedOccupancy] = await Promise.all([
    loadRoleDashboardCounts("ADMIN"),
    bedOccupancySeries(),
  ]);

  return (
    <AuthenticatedShell>
      <PageEnter>
        <AdminOperationsDashboard
          pendingLeave={counts.pendingLeave ?? 0}
          pharmacyAlerts={counts.pharmacyAlerts ?? 0}
          inventoryAlerts={counts.inventoryAlerts ?? 0}
          billingAlerts={counts.billingAlerts ?? 0}
          labQueue={counts.labQueue ?? 0}
          pharmacyQueue={counts.pharmacyQueue ?? 0}
          radiologyQueue={counts.radiologyQueue ?? 0}
          bedOccupancy={bedOccupancy}
        />
      </PageEnter>
    </AuthenticatedShell>
  );
}
