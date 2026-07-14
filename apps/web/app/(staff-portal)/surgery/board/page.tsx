import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { SurgeryBoard } from "@/components/surgery/SurgeryBoard";
import { redirect } from "next/navigation";

export default async function SurgeryBoardPage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "DOCTOR", "RECEPTIONIST"].includes(user.role)) {
    redirect("/");
  }

  return (
    <AuthenticatedShell>
      <SurgeryBoard role={user.role} />
    </AuthenticatedShell>
  );
}
