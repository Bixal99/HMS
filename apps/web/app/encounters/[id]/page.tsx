import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { ConsultationWorkspace } from "@/components/encounters/ConsultationWorkspace";
import { redirect } from "next/navigation";

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  if (!["DOCTOR", "NURSE", "ADMIN", "PATIENT"].includes(user.role)) {
    redirect("/");
  }
  const { id } = await params;

  return (
    <AuthenticatedShell>
      <ConsultationWorkspace encounterId={id} role={user.role} />
    </AuthenticatedShell>
  );
}
