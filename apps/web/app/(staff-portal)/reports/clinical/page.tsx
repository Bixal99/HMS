import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { ClinicalDashboard } from "@/components/reports/ClinicalDashboard";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function ClinicalReportPage() {
  const user = await requireSessionUser();
  requireAbility(user, "read", "ClinicalReport");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <ClinicalDashboard />
      </PageEnter>
    </AuthenticatedShell>
  );
}
