import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { NursingBoard } from "@/components/wards/NursingBoard";
import { redirect } from "next/navigation";

export default async function NursingPage() {
  const user = await requireSessionUser();
  if (!["NURSE", "ADMIN"].includes(user.role)) {
    redirect("/");
  }

  return (
    <AuthenticatedShell>
      <NursingBoard />
    </AuthenticatedShell>
  );
}
