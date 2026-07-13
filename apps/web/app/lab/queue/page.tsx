import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { LabProcessingBoard } from "@/components/lab/LabProcessingBoard";
import { redirect } from "next/navigation";

export default async function LabQueuePage() {
  const user = await requireSessionUser();
  if (!["LAB_TECHNICIAN", "ADMIN"].includes(user.role)) {
    redirect("/");
  }

  return (
    <AuthenticatedShell>
      <LabProcessingBoard role={user.role} />
    </AuthenticatedShell>
  );
}
