import { redirect } from "next/navigation";
import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { ClinicalDashboard } from "@/components/reports/ClinicalDashboard";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function ClinicalReportPage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "DOCTOR"].includes(user.role)) redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <ClinicalDashboard />
      </PageEnter>
    </AuthenticatedShell>
  );
}
