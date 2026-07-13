import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PatientList } from "@/components/patients/PatientList";
import { PageEnter } from "@/components/shared/PageEnter";

export default function PatientsPage() {
  return (
    <AuthenticatedShell>
      <PageEnter className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Search, register, and open charts ·{" "}
            <Link href="/patients/new" className="text-primary underline-offset-4 hover:underline">
              Register patient
            </Link>
          </p>
        </div>
        <PatientList />
      </PageEnter>
    </AuthenticatedShell>
  );
}
