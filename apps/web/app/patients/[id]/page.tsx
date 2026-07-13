import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PatientProfile } from "@/components/patients/PatientProfile";
import { PageEnter } from "@/components/shared/PageEnter";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AuthenticatedShell>
      <PageEnter>
        <PatientProfile patientId={id} />
      </PageEnter>
    </AuthenticatedShell>
  );
}
