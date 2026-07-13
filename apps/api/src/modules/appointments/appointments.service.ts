import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { startOfDay, addMinutes } from "date-fns";
import { getAvailableSlots } from "./slotGenerator";

const appointmentInclude = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      phone: true,
    },
  },
  doctor: {
    select: {
      id: true,
      designation: true,
      specialization: true,
      user: { select: { name: true, email: true } },
    },
  },
} as const;

export async function resolveStaffId(userId: string) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: { id: true },
  });
  return staff?.id ?? null;
}

export async function resolvePatientId(userId: string) {
  const patient = await prisma.patient.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  return patient?.id ?? null;
}

export async function listSlots(doctorId: string, date: Date) {
  return getAvailableSlots(doctorId, date);
}

export async function listDoctors() {
  return prisma.staff.findMany({
    where: { isActive: true, user: { role: "DOCTOR" } },
    select: {
      id: true,
      designation: true,
      specialization: true,
      department: { select: { id: true, name: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { employeeCode: "asc" },
  });
}

export async function bookAppointment(input: {
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  reasonForVisit?: string | null;
  durationMinutes?: number;
  createdBy: string;
}) {
  return prisma.appointment.create({
    data: {
      patientId: input.patientId,
      doctorId: input.doctorId,
      scheduledAt: input.scheduledAt,
      reasonForVisit: input.reasonForVisit ?? null,
      durationMinutes: input.durationMinutes ?? 15,
      createdBy: input.createdBy,
    },
    include: appointmentInclude,
  });
}

export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
}

export async function rescheduleAppointment(
  id: string,
  scheduledAt: Date,
  doctorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.status === "CANCELLED" || existing.status === "COMPLETED") {
      throw new Error("NOT_RESCHEDULABLE");
    }

    const targetDoctorId = doctorId ?? existing.doctorId;

    await tx.appointment.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelReason: "Rescheduled",
      },
    });

    try {
      return await tx.appointment.create({
        data: {
          patientId: existing.patientId,
          doctorId: targetDoctorId,
          scheduledAt,
          durationMinutes: existing.durationMinutes,
          reasonForVisit: existing.reasonForVisit,
          createdBy: existing.createdBy,
          status: "SCHEDULED",
        },
        include: appointmentInclude,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw err;
      }
      throw err;
    }
  });
}

export async function cancelAppointment(id: string, cancelReason: string) {
  return prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancelReason },
    include: appointmentInclude,
  });
}

export async function checkInAppointment(id: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.status !== "SCHEDULED") {
    throw new Error("INVALID_STATUS");
  }
  return prisma.appointment.update({
    where: { id },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
    include: appointmentInclude,
  });
}

export async function completeAppointment(id: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return null;
  if (!["SCHEDULED", "CHECKED_IN", "IN_PROGRESS"].includes(existing.status)) {
    throw new Error("INVALID_STATUS");
  }
  return prisma.appointment.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
    include: appointmentInclude,
  });
}

export async function markNoShow(id: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return null;
  if (!["SCHEDULED", "CHECKED_IN"].includes(existing.status)) {
    throw new Error("INVALID_STATUS");
  }
  return prisma.appointment.update({
    where: { id },
    data: { status: "NO_SHOW" },
    include: appointmentInclude,
  });
}

export async function joinWaitlist(input: {
  patientId: string;
  doctorId: string;
  preferredDate: Date;
}) {
  return prisma.appointmentWaitlist.create({
    data: {
      patientId: input.patientId,
      doctorId: input.doctorId,
      preferredDate: startOfDay(input.preferredDate),
    },
  });
}

export async function getTodayQueue(doctorId: string, day: Date = new Date()) {
  const dayStart = startOfDay(day);
  const dayEnd = addMinutes(dayStart, 1440);

  return prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mrn: true,
          phone: true,
        },
      },
      doctor: {
        select: {
          id: true,
          designation: true,
          specialization: true,
          user: { select: { name: true, email: true } },
        },
      },
      encounter: { select: { id: true, status: true } },
    },
  });
}

export { Prisma };
