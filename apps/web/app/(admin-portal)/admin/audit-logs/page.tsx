import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function AuditLogsPage() {
  const user = await requireSessionUser();
  requireAbility(user, "read", "AuditLog");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <AuditLogViewer />
      </PageEnter>
    </AuthenticatedShell>
  );
}
