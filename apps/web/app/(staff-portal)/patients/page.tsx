import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PatientList } from "@/components/patients/PatientList";
import { PageEnter } from "@/components/shared/PageEnter";
import { getAbilityForUser } from "@/lib/ability";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function PatientsPage() {
  const user = await requireSessionUser();
  requireAbility(user, "read", "Patient");
  const canRegister = getAbilityForUser(user).can("create", "Patient");

  return (
    <AuthenticatedShell>
      <PageEnter className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Search, register, and open charts
            {canRegister ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href="/patients/new"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Register patient
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <PatientList />
      </PageEnter>
    </AuthenticatedShell>
  );
}
