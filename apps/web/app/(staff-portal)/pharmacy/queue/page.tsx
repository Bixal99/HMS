import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { FulfillmentBoard } from "@/components/pharmacy/FulfillmentBoard";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function PharmacyQueuePage() {
  const user = await requireSessionUser();
  requireAbility(user, "manage", "Dispense");

  return (
    <AuthenticatedShell>
      <FulfillmentBoard />
    </AuthenticatedShell>
  );
}
