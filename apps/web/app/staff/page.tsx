import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { StaffDirectory } from "@/components/staff/StaffDirectory";

export default function StaffPage() {
  return (
    <AuthenticatedShell>
      <StaffDirectory />
    </AuthenticatedShell>
  );
}
