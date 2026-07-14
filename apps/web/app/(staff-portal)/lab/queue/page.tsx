import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { LabProcessingBoard } from "@/components/lab/LabProcessingBoard";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function LabQueuePage() {
  const user = await requireSessionUser();
  requireAbility(user, "manage", "LabOrder");

  return (
    <AuthenticatedShell>
      <LabProcessingBoard role={user.role} />
    </AuthenticatedShell>
  );
}
