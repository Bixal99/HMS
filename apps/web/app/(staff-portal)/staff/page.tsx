import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { StaffDirectory } from "@/components/staff/StaffDirectory";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function StaffPage() {
  const user = await requireSessionUser();
  requireAbility(user, "read", "Staff");

  return (
    <AuthenticatedShell>
      <StaffDirectory />
    </AuthenticatedShell>
  );
}
