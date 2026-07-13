import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { BookingFlow } from "@/components/appointments/BookingFlow";
import { redirect } from "next/navigation";

export default async function BookAppointmentPage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "RECEPTIONIST", "PATIENT"].includes(user.role)) {
    redirect("/");
  }

  return (
    <AuthenticatedShell>
      <BookingFlow mode={user.role === "PATIENT" ? "patient" : "staff"} />
    </AuthenticatedShell>
  );
}
