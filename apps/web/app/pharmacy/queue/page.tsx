import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { FulfillmentBoard } from "@/components/pharmacy/FulfillmentBoard";

export default function PharmacyQueuePage() {
  return (
    <AuthenticatedShell>
      <FulfillmentBoard />
    </AuthenticatedShell>
  );
}
