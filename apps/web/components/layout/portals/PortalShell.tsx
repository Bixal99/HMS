import { AppShell } from "@/components/layout/AppShell";
import { CriticalLabAlertListener } from "@/components/lab/CriticalLabAlertListener";
import { UrgentIntakeAlertListener } from "@/components/intake/UrgentIntakeAlertListener";
import { RoleHandoffListener } from "@/components/notifications/RoleHandoffListener";
import { getAbilityForUser } from "@/lib/ability";
import { portalForRole, type Portal } from "@/lib/portal";
import { requirePortal } from "@/lib/require-portal";
import { buildNavGroups } from "@/lib/sidebar-config";
import { requireSessionUser } from "@/lib/session-user";

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

/**
 * Shell chrome for a portal. Badge counts are hydrated client-side so each
 * navigation is not blocked on ~8 count API round-trips (especially Admin).
 */
export async function PortalShell({
  portal,
  children,
}: {
  portal: Portal;
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();
  requirePortal(user, portal);

  const ability = getAbilityForUser(user);
  const effectivePortal = portalForRole(user.role);

  const navGroups = buildNavGroups({
    role: user.role,
    portal: effectivePortal,
    badges: {},
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
