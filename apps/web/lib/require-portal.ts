import { redirect } from "next/navigation";
import { homeForRole } from "@/lib/role-routes";
import {
  portalForRole,
  roleMayAccessPortal,
  type Portal,
} from "@/lib/portal";
import type { Actions, Subjects } from "@shared/auth";
import { getAbilityForUser, type AbilityUser } from "@/lib/ability";

export function requirePortal(
  user: { role: string },
  allowed: Portal | Portal[],
): void {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  const ok = list.some((p) => roleMayAccessPortal(user.role, p));
  if (!ok) {
    redirect(homeForRole(user.role));
  }
}

export function requireRoles(
  user: { role: string },
  allowedRoles: string[],
): void {
  if (!allowedRoles.includes(user.role)) {
    redirect(homeForRole(user.role));
  }
}

/** Dashboard workspace: matching role, or ADMIN for oversight dashboards only when listed. */
export function requireDashboardRole(
  user: { role: string },
  expectedRole: string,
): void {
  if (user.role !== expectedRole) {
    redirect(homeForRole(user.role));
  }
}

export function requireAbility(
  user: AbilityUser,
  action: Actions,
  subject: Subjects,
): void {
  const ability = getAbilityForUser(user);
  if (!ability.can(action, subject)) {
    redirect(homeForRole(user.role));
  }
}

export function assertPortalMatchesRole(role: string, portal: Portal): void {
  if (portalForRole(role) !== portal && !(role === "ADMIN" && portal === "admin")) {
    if (!roleMayAccessPortal(role, portal)) {
      redirect(homeForRole(role));
    }
  }
}
