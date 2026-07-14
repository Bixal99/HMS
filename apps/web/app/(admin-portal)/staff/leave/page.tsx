import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { LeaveInbox } from "@/components/staff/LeaveInbox";

export default function LeaveInboxPage() {
  return (
    <AuthenticatedShell>
      <LeaveInbox />
    </AuthenticatedShell>
  );
}
