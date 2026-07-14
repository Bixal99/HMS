import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { RegisterPatientForm } from "@/components/patients/RegisterPatientForm";
import { PageEnter } from "@/components/shared/PageEnter";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function NewPatientPage() {
  const user = await requireSessionUser();
  requireAbility(user, "create", "Patient");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <RegisterPatientForm />
      </PageEnter>
    </AuthenticatedShell>
  );
}
