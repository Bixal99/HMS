import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { LabCatalogAdmin } from "@/components/admin/LabCatalogAdmin";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireSessionUser } from "@/lib/session-user";
import { redirect } from "next/navigation";

export default async function AdminLabCatalogPage() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") redirect("/");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <LabCatalogAdmin />
      </PageEnter>
    </AuthenticatedShell>
  );
}
