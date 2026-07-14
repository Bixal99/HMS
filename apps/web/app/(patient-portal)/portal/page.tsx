import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PatientPortalHome } from "@/components/encounters/PatientPortalHome";
import { requirePortal } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function PatientPortalPage() {
  const user = await requireSessionUser();
  requirePortal(user, "patient");

  return (
    <AuthenticatedShell>
      <PatientPortalHome />
    </AuthenticatedShell>
  );
}
