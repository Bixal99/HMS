import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { OccupancyBoard } from "@/components/wards/OccupancyBoard";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function WardsPage() {
  const user = await requireSessionUser();
  requireAbility(user, "read", "Ward");

  return (
    <AuthenticatedShell>
      <OccupancyBoard role={user.role} />
    </AuthenticatedShell>
  );
}
