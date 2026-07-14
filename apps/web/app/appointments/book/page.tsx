import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { DirectBookingWithRedFlags } from "@/components/intake/DirectBookingWithRedFlags";
import { BookingFlow } from "@/components/appointments/BookingFlow";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function BookAppointmentPage() {
  const user = await requireSessionUser();
  requireAbility(user, "create", "Appointment");

  const isPatient = user.role === "PATIENT";

  return (
    <AuthenticatedShell>
      {isPatient ? (
        <DirectBookingWithRedFlags mode="patient" />
      ) : (
        <BookingFlow mode="staff" />
      )}
    </AuthenticatedShell>
  );
}
