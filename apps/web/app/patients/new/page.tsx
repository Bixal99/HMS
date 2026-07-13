import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { RegisterPatientForm } from "@/components/patients/RegisterPatientForm";
import { PageEnter } from "@/components/shared/PageEnter";

export default function NewPatientPage() {
  return (
    <AuthenticatedShell>
      <PageEnter>
        <RegisterPatientForm />
      </PageEnter>
    </AuthenticatedShell>
  );
}
