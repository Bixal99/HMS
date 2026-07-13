import { differenceInMinutes, format } from "date-fns";
import { prisma } from "../../lib/prisma";

export type OperationalReportParams = {
  start: Date;
  end: Date;
};

export async function getOperationalReport({ start, end }: OperationalReportParams) {
  const appointments = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: start, lte: end } },
    select: {
      scheduledAt: true,
      status: true,
      checkedInAt: true,
      inProgressAt: true,
    },
  });

  const dailyVolumeMap = new Map<string, number>();
  for (const appt of appointments) {
    const day = format(appt.scheduledAt, "yyyy-MM-dd");
    dailyVolumeMap.set(day, (dailyVolumeMap.get(day) ?? 0) + 1);
  }
  const dailyVolume = Array.from(dailyVolumeMap.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const totalAppointments = appointments.length;
  const noShowCount = appointments.filter((a) => a.status === "NO_SHOW").length;
  const noShowRate = totalAppointments > 0 ? noShowCount / totalAppointments : 0;

  const waitSamples = appointments
    .filter((a) => a.checkedInAt && a.inProgressAt)
    .map((a) => differenceInMinutes(a.inProgressAt as Date, a.checkedInAt as Date));
  const avgWaitMinutes =
    waitSamples.length > 0
      ? waitSamples.reduce((sum, v) => sum + v, 0) / waitSamples.length
      : null;

  return {
    range: { start, end },
    dailyVolume,
    totalAppointments,
    noShowCount,
    noShowRate,
    avgWaitMinutes,
  };
}
