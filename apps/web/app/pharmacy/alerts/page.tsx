import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PharmacyAlertsPanel } from "@/components/pharmacy/PharmacyAlertsPanel";

export default function PharmacyAlertsPage() {
  return (
    <AuthenticatedShell>
      <PharmacyAlertsPanel />
    </AuthenticatedShell>
  );
}
