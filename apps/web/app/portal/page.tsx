import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PatientPortalHome } from "@/components/encounters/PatientPortalHome";

export default function PatientPortalPage() {
  return (
    <AuthenticatedShell>
      <PatientPortalHome />
    </AuthenticatedShell>
  );
}
