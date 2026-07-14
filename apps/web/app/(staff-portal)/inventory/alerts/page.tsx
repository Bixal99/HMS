import { redirect } from "next/navigation";
import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { InventoryAlertsPanel } from "@/components/inventory/InventoryAlertsPanel";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function InventoryAlertsPage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "NURSE", "LAB_TECHNICIAN"].includes(user.role)) {
    redirect("/");
  }

  return (
    <AuthenticatedShell>
      <PageEnter>
        <InventoryAlertsPanel />
      </PageEnter>
    </AuthenticatedShell>
  );
}
