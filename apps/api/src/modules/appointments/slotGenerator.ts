import { addMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import { prisma } from "../../lib/prisma";

/** Combine a calendar date with an "HH:mm" (or "HH:mm:ss") wall-clock time. */
export function combineDateAndTime(date: Date, time: string): Date {
  const [h = "0", m = "0"] = time.split(":");
  const result = startOfDay(date);
  result.setHours(Number(h), Number(m), 0, 0);
  return result;
}

export type SlotInfo = {
  start: string;
  available: boolean;
  reason?: "booked" | "past";
};

/**
 * Derive bookable slots from StaffAvailability for a doctor on a calendar day,
 * excluding booked (non-cancelled) appointments and approved leave days.
 * Booked / past slots are returned as `available: false` (muted in UI, not hidden).
 */
export async function getAvailableSlots(doctorId: string, date: Date): Promise<SlotInfo[]> {
  const dayOfWeek = date.getDay();

  const availability = await prisma.staffAvailability.findMany({
    where: { staffId: doctorId, dayOfWeek },
  });
  if (availability.length === 0) return [];

  const dayStart = startOfDay(date);
  const dayEnd = addMinutes(dayStart, 1440);

  const onApprovedLeave = await prisma.staffLeaveRequest.findFirst({
    where: {
      staffId: doctorId,
      status: "APPROVED",
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
  });
  if (onApprovedLeave) return [];

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: {
        in: ["PENDING", "CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"],
      },
    },
    select: { scheduledAt: true },
  });
  const bookedTimes = new Set(existingAppointments.map((a) => a.scheduledAt.toISOString()));

  const now = new Date();
  const slots: SlotInfo[] = [];

  for (const block of availability) {
    let cursor = combineDateAndTime(date, block.startTime);
    const end = combineDateAndTime(date, block.endTime);
    while (isBefore(cursor, end)) {
      const iso = cursor.toISOString();
      const booked = bookedTimes.has(iso);
      const past = !isAfter(cursor, now);
      slots.push({
        start: iso,
        available: !booked && !past,
        reason: booked ? "booked" : past ? "past" : undefined,
      });
      cursor = addMinutes(cursor, block.slotDurationMins);
    }
  }

  return slots;
}
