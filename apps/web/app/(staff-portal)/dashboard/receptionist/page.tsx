import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { RoleHomeDashboard, RoleIcons } from "@/components/dashboard/RoleHomeDashboard";
import { loadRoleDashboardCounts } from "@/lib/dashboard-counts";
import {
  appointmentOutcomeSeries,
  appointmentsLineSeries,
  bedAvailabilityBarSeries,
  todayQueueByStatusSeries,
} from "@/lib/role-dashboard-series";
import { requireDashboardRole } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function ReceptionistDashboardPage() {
  const user = await requireSessionUser();
  requireDashboardRole(user, "RECEPTIONIST");

  const counts = await loadRoleDashboardCounts("RECEPTIONIST");
  const queue = counts.todayQueue ?? 0;
  const occupied = counts.occupiedBeds ?? 0;
  const available = counts.availableBeds ?? 0;

  const [queueStatus, bookings, beds, outcomes] = await Promise.all([
    todayQueueByStatusSeries(),
    appointmentsLineSeries(),
    bedAvailabilityBarSeries(),
    appointmentOutcomeSeries(),
  ]);

  return (
    <AuthenticatedShell>
      <PageEnter>
        <RoleHomeDashboard
          title="Reception dashboard"
          description="Register patients and book appointments into doctor schedules."
          heroTitle="Front desk flow"
          heroBody="Book appointments, register new patients, and keep today’s queue moving — including walk-ins."
          illustrationSrc="/illustrations/auth-register.svg"
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
              label: "Bed utilization",
              value:
                occupied + available === 0
                  ? "—"
                  : `${Math.round((occupied / (occupied + available)) * 100)}%`,
              icon: RoleIcons.CalendarDays,
              hint: "Occupied / total",
            },
          ]}
          charts={[queueStatus, bookings, beds, outcomes]}
          actions={[
            {
              href: "/appointments/book",
              label: "Book appointment",
              variant: "default",
              icon: RoleIcons.CalendarDays,
            },
            {
              href: "/patients/new",
              label: "Register patient",
              icon: RoleIcons.UserPlus,
            },
            {
              href: "/appointments/queue",
              label: "Today's queue",
              icon: RoleIcons.ClipboardList,
            },
            { href: "/surgery/board", label: "Surgery board" },
            { href: "/wards", label: "Ward occupancy", icon: RoleIcons.BedDouble },
            { href: "/patients", label: "Patients", icon: RoleIcons.Users },
          ]}
        />
      </PageEnter>
    </AuthenticatedShell>
  );
}
