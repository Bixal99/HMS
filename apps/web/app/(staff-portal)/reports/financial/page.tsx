import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { FinancialDashboard } from "@/components/reports/FinancialDashboard";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function FinancialReportPage() {
  const user = await requireSessionUser();
  requireAbility(user, "read", "FinancialReport");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <FinancialDashboard />
      </PageEnter>
    </AuthenticatedShell>
  );
}
