import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { IntakeWizard } from "@/components/intake/IntakeWizard";
import { redirect } from "next/navigation";

export default async function PatientIntakePage() {
  const user = await requireSessionUser();
  if (user.role !== "PATIENT") {
    redirect("/appointments/book");
  }

  return (
    <AuthenticatedShell>
      <IntakeWizard />
    </AuthenticatedShell>
  );
}
