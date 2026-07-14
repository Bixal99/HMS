import { AppShell } from "@/components/layout/AppShell";
import { CriticalLabAlertListener } from "@/components/lab/CriticalLabAlertListener";
import { UrgentIntakeAlertListener } from "@/components/intake/UrgentIntakeAlertListener";
import { RoleHandoffListener } from "@/components/notifications/RoleHandoffListener";
import { fetchApiCount } from "@/lib/dashboard-counts";
import { getAbilityForUser } from "@/lib/ability";
import { portalForRole, type Portal } from "@/lib/portal";
import { requirePortal } from "@/lib/require-portal";
import {
  buildNavGroups,
  type BadgeCounts,
} from "@/lib/sidebar-config";
import {
  cookieHeaderFromStore,
  requireSessionUser,
  type SessionUser,
} from "@/lib/session-user";

async function loadBadges(
  user: SessionUser,
  cookieHeader: string,
): Promise<BadgeCounts> {
  const [
    leavePending,
    pharmacyAlerts,
    pharmacyQueue,
    labQueue,
    radiologyQueue,
    billingAlerts,
    patientUnpaid,
    inventoryAlerts,
    appointmentPending,
  ] = await Promise.all([
    user.role === "ADMIN"
      ? fetchApiCount("/api/staff/leave-requests/pending-count", cookieHeader)
      : Promise.resolve(0),
    ["PHARMACIST", "ADMIN"].includes(user.role)
      ? fetchApiCount("/api/pharmacy/alerts/count", cookieHeader)
      : Promise.resolve(0),
    ["PHARMACIST", "ADMIN"].includes(user.role)
      ? fetchApiCount("/api/pharmacy/queue/count", cookieHeader)
      : Promise.resolve(0),
    ["LAB_TECHNICIAN", "ADMIN"].includes(user.role)
      ? fetchApiCount("/api/lab/orders/queue/count", cookieHeader)
      : Promise.resolve(0),
    ["LAB_TECHNICIAN", "ADMIN"].includes(user.role)
      ? fetchApiCount("/api/radiology/orders/queue/count", cookieHeader)
      : Promise.resolve(0),
    ["BILLING_OFFICER", "ADMIN"].includes(user.role)
      ? fetchApiCount("/api/billing/alerts/count", cookieHeader)
      : Promise.resolve(0),
    user.role === "PATIENT"
      ? fetchApiCount("/api/billing/invoices/mine/unpaid-count", cookieHeader)
      : Promise.resolve(0),
    ["ADMIN", "NURSE", "LAB_TECHNICIAN"].includes(user.role)
      ? fetchApiCount("/api/inventory/alerts/count", cookieHeader)
      : Promise.resolve(0),
    ["ADMIN", "RECEPTIONIST"].includes(user.role)
      ? fetchApiCount("/api/appointments/pending/counts", cookieHeader)
      : Promise.resolve(0),
  ]);

  return {
    leavePending,
    pharmacyAlerts,
    pharmacyQueue,
    labQueue,
    radiologyQueue,
    billingAlerts,
    patientUnpaid,
    inventoryAlerts,
    appointmentPending,
  };
}

function PortalListeners({ role }: { role: string }) {
  return (
    <>
      {role === "DOCTOR" ? <CriticalLabAlertListener enabled /> : null}
      {["DOCTOR", "RECEPTIONIST", "ADMIN"].includes(role) ? (
        <UrgentIntakeAlertListener enabled />
      ) : null}
      <RoleHandoffListener role={role} />
    </>
  );
}

export async function PortalShell({
  portal,
  children,
}: {
  portal: Portal;
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();
  requirePortal(user, portal);

  const cookieHeader = await cookieHeaderFromStore();
  const badges = await loadBadges(user, cookieHeader);
  const ability = getAbilityForUser(user);
  const effectivePortal = portalForRole(user.role);

  const navGroups = buildNavGroups({
    role: user.role,
    portal: effectivePortal,
    badges,
    ability,
    useAbilities: true,
  });

  return (
    <AppShell
      user={{ email: user.email, role: user.role, name: user.name }}
      navGroups={navGroups}
    >
      <PortalListeners role={user.role} />
      {children}
    </AppShell>
  );
}
