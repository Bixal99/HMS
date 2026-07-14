import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PendingRequestsBoard } from "@/components/appointments/PendingRequestsBoard";
import { requireSessionUser } from "@/lib/session-user";
import { redirect } from "next/navigation";

export default async function PendingAppointmentsPage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "RECEPTIONIST"].includes(user.role)) {
    redirect("/");
  }
  return (
    <AuthenticatedShell>
      <PendingRequestsBoard />
    </AuthenticatedShell>
  );
}
