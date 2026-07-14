import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { InventoryBoard } from "@/components/inventory/InventoryBoard";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function InventoryPage() {
  const user = await requireSessionUser();
  requireAbility(user, "read", "InventoryItem");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <InventoryBoard role={user.role} />
      </PageEnter>
    </AuthenticatedShell>
  );
}
