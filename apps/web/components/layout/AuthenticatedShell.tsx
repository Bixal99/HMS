import { AdminPortalLayout } from "@/components/layout/portals/AdminPortalLayout";
import { StaffPortalLayout } from "@/components/layout/portals/StaffPortalLayout";
import { PatientPortalLayout } from "@/components/layout/portals/PatientPortalLayout";
import { portalForRole } from "@/lib/portal";
import { requireSessionUser } from "@/lib/session-user";

export { requireSessionUser } from "@/lib/session-user";

/**
 * Thin dispatcher: pick Admin / Staff / Patient portal layout by role.
 * Keeps existing page usage (`<AuthenticatedShell>`) working without URL changes.
 */
export async function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();
  const portal = portalForRole(user.role);

  if (portal === "admin") {
    return <AdminPortalLayout>{children}</AdminPortalLayout>;
  }
  if (portal === "patient") {
    return <PatientPortalLayout>{children}</PatientPortalLayout>;
  }
  return <StaffPortalLayout>{children}</StaffPortalLayout>;
}
