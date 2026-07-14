import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { OperationalDashboard } from "@/components/reports/OperationalDashboard";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function OperationalReportPage() {
  const user = await requireSessionUser();
  requireAbility(user, "read", "OperationalReport");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <OperationalDashboard />
      </PageEnter>
    </AuthenticatedShell>
  );
}
