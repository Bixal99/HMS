import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { WardStructureAdmin } from "@/components/admin/WardStructureAdmin";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireSessionUser } from "@/lib/session-user";
import { redirect } from "next/navigation";

export default async function AdminWardsPage() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <WardStructureAdmin />
      </PageEnter>
    </AuthenticatedShell>
  );
}
