import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { TodayQueue } from "@/components/appointments/TodayQueue";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function QueuePage() {
  const user = await requireSessionUser();
  if (!["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"].includes(user.role)) {
    redirect("/");
  }

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
