import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { OccupancyBoard } from "@/components/wards/OccupancyBoard";
import { redirect } from "next/navigation";

export default async function WardsPage() {
  const user = await requireSessionUser();
  if (!["NURSE", "DOCTOR", "ADMIN", "RECEPTIONIST"].includes(user.role)) {
    redirect("/");
  }

  return (
    <AuthenticatedShell>
      <OccupancyBoard role={user.role} />
    </AuthenticatedShell>
  );
}
