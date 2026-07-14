import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PatientAppointmentsList } from "@/components/appointments/PatientAppointmentsList";
import { requireSessionUser } from "@/lib/session-user";
import { redirect } from "next/navigation";

export default async function PortalAppointmentsPage() {
  const user = await requireSessionUser();
  if (user.role !== "PATIENT") redirect("/");
  return (
    <AuthenticatedShell>
      <PatientAppointmentsList />
    </AuthenticatedShell>
  );
}
