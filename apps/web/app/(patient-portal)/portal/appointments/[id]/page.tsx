import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PatientAppointmentDetail } from "@/components/appointments/PatientAppointmentDetail";
import { requireSessionUser } from "@/lib/session-user";
import { redirect } from "next/navigation";

export default async function PortalAppointmentDetailPage() {
  const user = await requireSessionUser();
  if (user.role !== "PATIENT") redirect("/");
  return (
    <AuthenticatedShell>
      <PatientAppointmentDetail />
    </AuthenticatedShell>
  );
}
