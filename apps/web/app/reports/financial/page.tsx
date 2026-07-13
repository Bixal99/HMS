import { redirect } from "next/navigation";
import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { FinancialDashboard } from "@/components/reports/FinancialDashboard";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function FinancialReportPage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "BILLING_OFFICER"].includes(user.role)) redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <FinancialDashboard />
      </PageEnter>
    </AuthenticatedShell>
  );
}
