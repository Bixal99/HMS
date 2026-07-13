import { redirect } from "next/navigation";
import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { ReconcileGrid } from "@/components/inventory/ReconcileGrid";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function InventoryReconcilePage() {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") {
    redirect("/inventory");
  }

  return (
    <AuthenticatedShell>
      <PageEnter>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Stock reconciliation</h1>
            <p className="text-sm text-muted-foreground">
              Enter physical counts. Only changed rows post as ADJUSTMENT with MISCOUNT.
            </p>
          </div>
          <ReconcileGrid />
        </div>
      </PageEnter>
    </AuthenticatedShell>
  );
}
