import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { RoleHomeDashboard, RoleIcons } from "@/components/dashboard/RoleHomeDashboard";
import { loadRoleDashboardCounts } from "@/lib/dashboard-counts";
import {
  appointmentsLineSeries,
  bedOccupancySeries,
  surgeryByStatusSeries,
  todayQueueByStatusSeries,
} from "@/lib/role-dashboard-series";
import { requireDashboardRole } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function DoctorDashboardPage() {
  const user = await requireSessionUser();
  requireDashboardRole(user, "DOCTOR");

  const counts = await loadRoleDashboardCounts("DOCTOR");
  const queue = counts.todayQueue ?? 0;
  const occupied = counts.occupiedBeds ?? 0;
  const available = counts.availableBeds ?? 0;

  const [queueByStatus, beds, bookings, surgery] = await Promise.all([
    todayQueueByStatusSeries(),
    bedOccupancySeries(),
    appointmentsLineSeries(),
    surgeryByStatusSeries(),
  ]);

  return (
    <AuthenticatedShell>
      <PageEnter>
        <RoleHomeDashboard
          title="Doctor dashboard"
          description="Clinical workspace for today’s queue, wards, and surgery."
          heroTitle="Start with the live queue"
          heroBody="Check in patients, open encounters, recommend surgery, and review the clinical report when you need trends."
          kpis={[
            {
              label: "Today's queue",
              value: queue,
              icon: RoleIcons.ClipboardList,
              hint: "Scheduled / in progress",
              tone: queue > 0 ? "default" : "success",
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
              label: "Bed utilization",
              value:
                occupied + available === 0
                  ? "—"
                  : `${Math.round((occupied / (occupied + available)) * 100)}%`,
              icon: RoleIcons.CalendarDays,
              hint: "Occupied / total",
            },
          ]}
          charts={[queueByStatus, beds, bookings, surgery]}
          actions={[
            {
              href: "/appointments/queue",
              label: "Today's queue",
              variant: "default",
              icon: RoleIcons.ClipboardList,
            },
            { href: "/wards", label: "Ward occupancy", icon: RoleIcons.BedDouble },
            { href: "/surgery/board", label: "Surgery board", icon: RoleIcons.CalendarDays },
            { href: "/reports/clinical", label: "Clinical report" },
            { href: "/patients", label: "Patients", icon: RoleIcons.Users },
          ]}
        />
      </PageEnter>
    </AuthenticatedShell>
  );
}
