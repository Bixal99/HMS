import { redirect } from "next/navigation";
import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { InventoryBoard } from "@/components/inventory/InventoryBoard";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function InventoryPage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "NURSE", "LAB_TECHNICIAN"].includes(user.role)) {
    redirect(user.role === "PATIENT" ? "/portal" : "/");
  }

  return (
    <AuthenticatedShell>
      <PageEnter>
        <InventoryBoard role={user.role} />
      </PageEnter>
    </AuthenticatedShell>
  );
}
