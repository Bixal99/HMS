import { redirect } from "next/navigation";
import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { EquipmentBoard } from "@/components/inventory/EquipmentBoard";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function InventoryEquipmentPage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "NURSE", "LAB_TECHNICIAN"].includes(user.role)) {
    redirect("/");
  }

  return (
    <AuthenticatedShell>
      <PageEnter>
        <EquipmentBoard role={user.role} />
      </PageEnter>
    </AuthenticatedShell>
  );
}
