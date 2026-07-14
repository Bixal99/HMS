import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { TodayQueue } from "@/components/appointments/TodayQueue";
import { prisma } from "@/lib/prisma";
import { requireAbility, requireRoles } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function QueuePage() {
  const user = await requireSessionUser();
  requireRoles(user, ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]);
  requireAbility(user, "read", "Appointment");

  let selfStaffId: string | null = null;
  if (user.role === "DOCTOR") {
    const staff = await prisma.staff.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    selfStaffId = staff?.id ?? null;
  }

  return (
    <AuthenticatedShell>
      <TodayQueue role={user.role} selfStaffId={selfStaffId} />
    </AuthenticatedShell>
  );
}
