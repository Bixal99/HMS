import { redirect } from "next/navigation";
import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { OperationalDashboard } from "@/components/reports/OperationalDashboard";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function OperationalReportPage() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <OperationalDashboard />
      </PageEnter>
    </AuthenticatedShell>
  );
}
