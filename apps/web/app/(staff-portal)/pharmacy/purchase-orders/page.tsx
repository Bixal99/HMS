import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PurchaseOrdersPanel } from "@/components/pharmacy/PurchaseOrdersPanel";

export default function PharmacyPurchaseOrdersPage() {
  return (
    <AuthenticatedShell>
      <PurchaseOrdersPanel />
    </AuthenticatedShell>
  );
}
