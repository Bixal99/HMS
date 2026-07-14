import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { ImagingQueueBoard } from "@/components/radiology/ImagingQueueBoard";
import { requireRoles } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function RadiologyQueuePage() {
  const user = await requireSessionUser();
  requireRoles(user, ["LAB_TECHNICIAN", "ADMIN"]);

  return (
    <AuthenticatedShell>
      <ImagingQueueBoard role={user.role} />
    </AuthenticatedShell>
  );
}
