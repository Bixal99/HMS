import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { AvailabilityGrid } from "@/components/staff/AvailabilityGrid";

export default function AvailabilityPage() {
  return (
    <AuthenticatedShell>
      <AvailabilityGrid />
    </AuthenticatedShell>
  );
}
