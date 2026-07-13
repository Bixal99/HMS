import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { prisma } from "../../lib/prisma";

export type ClinicalReportParams = {
  start: Date;
  end: Date;
  doctorId?: string | null;
};

export async function getClinicalReport({ start, end, doctorId }: ClinicalReportParams) {
  const encounterWhere = {
    encounterDate: { gte: start, lte: end },
    ...(doctorId ? { doctorId } : {}),
  };

  const diagnoses = await prisma.diagnosis.findMany({
    where: { encounter: encounterWhere },
    select: { icdCode: true, description: true },
  });

  const diagnosisMap = new Map<
    string,
    { icdCode: string | null; description: string; count: number }
  >();
  for (const d of diagnoses) {
    const key = `${d.icdCode ?? ""}|${d.description}`;
    const entry = diagnosisMap.get(key) ?? { icdCode: d.icdCode, description: d.description, count: 0 };
    entry.count += 1;
    diagnosisMap.set(key, entry);
  }
  const topDiagnoses = Array.from(diagnosisMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const prescriptions = await prisma.prescription.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      ...(doctorId ? { doctorId } : {}),
    },
    select: { createdAt: true },
  });
  const rxByDayMap = new Map<string, number>();
  for (const rx of prescriptions) {
    const day = format(rx.createdAt, "yyyy-MM-dd");
    rxByDayMap.set(day, (rxByDayMap.get(day) ?? 0) + 1);
  }
  const rxVolumeByDay = Array.from(rxByDayMap.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Bed occupancy is hospital-wide (beds are not owned by a doctor), so the
  // doctor filter does not apply here even when doctorId is set.
  const totalBeds = await prisma.bed.count();
  const admissions = await prisma.admission.findMany({
    where: {
      admittedAt: { lte: end },
      OR: [{ dischargedAt: null }, { dischargedAt: { gte: start } }],
    },
    select: { admittedAt: true, dischargedAt: true },
  });

  const dayCount = Math.max(0, differenceInCalendarDays(startOfDay(end), startOfDay(start)));
  const dailyBedOccupancy = Array.from({ length: dayCount + 1 }, (_, i) => {
    const dayStart = addDays(startOfDay(start), i);
    const dayEnd = addDays(dayStart, 1);
    const occupied = admissions.filter(
      (a) => a.admittedAt < dayEnd && (!a.dischargedAt || a.dischargedAt >= dayStart),
    ).length;
    const occupancyRate = totalBeds > 0 ? occupied / totalBeds : null;
    return { day: format(dayStart, "yyyy-MM-dd"), occupiedBeds: occupied, totalBeds, occupancyRate };
  });

  return {
    range: { start, end },
    doctorId: doctorId ?? null,
    topDiagnoses,
    rxVolumeByDay,
    dailyBedOccupancy,
  };
}
