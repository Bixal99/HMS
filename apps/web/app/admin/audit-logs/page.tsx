import { redirect } from "next/navigation";
import {
  AuthenticatedShell,
  requireSessionUser,
} from "@/components/layout/AuthenticatedShell";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function AuditLogsPage() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <AuditLogViewer />
      </PageEnter>
    </AuthenticatedShell>
  );
}
