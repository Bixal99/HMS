import { addHours, startOfDay, addMinutes } from "date-fns";
import {
  Prisma,
  type AppointmentPriority,
  type AppointmentSource,
  type AppointmentStatus,
  type AppointmentVisitType,
  type RejectionReasonCode,
} from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { getSetting } from "../settings/settings.service";
import { getAvailableSlots } from "./slotGenerator";
import { BLOCKING_STATUSES, DOCTOR_VISIBLE_STATUSES } from "./appointments.constants";
import { logAppointmentEvent } from "./appointments.events";

export const appointmentInclude = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      phone: true,
      bloodGroup: true,
      allergies: { select: { allergen: true, severity: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      designation: true,
      specialization: true,
      department: { select: { id: true, name: true } },
      user: { select: { name: true, email: true } },
    },
  },
  intake: {
    select: {
      id: true,
      isUrgent: true,
      chiefComplaintText: true,
      redFlagsSelected: true,
      severity: true,
      symptomCategory: { select: { id: true, name: true } },
    },
  },
  events: {
    orderBy: { createdAt: "asc" as const },
    take: 50,
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

export async function listDoctors(departmentId?: string) {
  return prisma.staff.findMany({
    where: {
      isActive: true,
      user: { role: "DOCTOR" },
      ...(departmentId ? { departmentId } : {}),
    },
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

async function pendingHoldHours() {
  const hours = await getSetting<number>("appointment.pendingHoldHours");
  return typeof hours === "number" && hours > 0 ? hours : 4;
}

export async function bookAppointment(input: {
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  reasonForVisit?: string | null;
  durationMinutes?: number;
  createdBy: string;
  intakeId?: string | null;
  isPatientSelfService: boolean;
  appointmentSource?: AppointmentSource;
  visitType?: AppointmentVisitType;
  priority?: AppointmentPriority;
  actorUserId: string;
}) {
  const holdHours = await pendingHoldHours();

  return prisma.$transaction(async (tx) => {
    let reasonForVisit = input.reasonForVisit ?? null;
    let priority: AppointmentPriority = input.priority ?? "NORMAL";
    let intake: {
      id: string;
      patientId: string;
      appointmentId: string | null;
      chiefComplaintText: string;
      isUrgent: boolean;
      symptomCategory: { name: string };
    } | null = null;

    if (input.intakeId) {
      intake = await tx.patientIntake.findUnique({
        where: { id: input.intakeId },
        select: {
          id: true,
          patientId: true,
          appointmentId: true,
          chiefComplaintText: true,
          isUrgent: true,
          symptomCategory: { select: { name: true } },
        },
      });
      if (!intake) throw new Error("INTAKE_NOT_FOUND");
      if (intake.patientId !== input.patientId) throw new Error("INTAKE_PATIENT_MISMATCH");
      if (intake.appointmentId) throw new Error("INTAKE_ALREADY_LINKED");
      if (!reasonForVisit) {
        reasonForVisit = intake.chiefComplaintText.slice(0, 500);
      }
      if (intake.isUrgent && priority === "NORMAL") {
        priority = "URGENT";
      }
    }

    const isPatient = input.isPatientSelfService;
    const status: AppointmentStatus = isPatient ? "PENDING" : "CONFIRMED";
    const source: AppointmentSource =
      input.appointmentSource ??
      (isPatient ? "PATIENT_PORTAL" : "RECEPTION");

    const appointment = await tx.appointment.create({
      data: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        scheduledAt: input.scheduledAt,
        reasonForVisit,
        durationMinutes: input.durationMinutes ?? 15,
        createdBy: input.createdBy,
        status,
        priority,
        appointmentSource: source,
        visitType: input.visitType ?? "ROUTINE",
        pendingExpiresAt: isPatient ? addHours(new Date(), holdHours) : null,
        confirmedAt: isPatient ? null : new Date(),
        confirmedById: isPatient ? null : input.actorUserId,
      },
      include: appointmentInclude,
    });

    if (intake) {
      await tx.patientIntake.update({
        where: { id: intake.id },
        data: { appointmentId: appointment.id },
      });
    }

    await logAppointmentEvent(tx, {
      appointmentId: appointment.id,
      eventType: "APPOINTMENT_CREATED",
      toStatus: status,
      actorUserId: input.actorUserId,
      metadata: { source, priority },
    });

    if (!isPatient) {
      await logAppointmentEvent(tx, {
        appointmentId: appointment.id,
        eventType: "STATUS_CHANGED",
        fromStatus: null,
        toStatus: "CONFIRMED",
        actorUserId: input.actorUserId,
        note: "Staff-created appointment auto-confirmed",
      });
    }

    return appointment;
  });
}

export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
}

export async function listMyAppointments(
  patientId: string,
  filter?: "upcoming" | "pending" | "past" | "cancelled",
) {
  const now = new Date();
  const where: Prisma.AppointmentWhereInput = { patientId };

  if (filter === "pending") {
    where.status = "PENDING";
  } else if (filter === "cancelled") {
    where.status = { in: ["CANCELLED", "REJECTED", "EXPIRED"] };
  } else if (filter === "past") {
    where.OR = [
      { status: { in: ["COMPLETED", "NO_SHOW"] } },
      { scheduledAt: { lt: now }, status: { in: ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"] } },
    ];
  } else if (filter === "upcoming") {
    where.status = { in: ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"] };
    where.scheduledAt = { gte: now };
  }

  return prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    include: appointmentInclude,
  });
}

export async function listPendingRequests() {
  return prisma.appointment.findMany({
    where: { status: "PENDING" },
    orderBy: [{ priority: "desc" }, { pendingExpiresAt: "asc" }, { createdAt: "asc" }],
    include: appointmentInclude,
  });
}

export async function listRescheduleRequests() {
  return prisma.appointment.findMany({
    where: {
      rescheduleRequestedAt: { not: null },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    orderBy: { rescheduleRequestedAt: "asc" },
    include: appointmentInclude,
  });
}

export async function confirmAppointment(id: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.status !== "PENDING") throw new Error("INVALID_STATUS");

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: actorUserId,
        pendingExpiresAt: null,
      },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "STATUS_CHANGED",
      fromStatus: "PENDING",
      toStatus: "CONFIRMED",
      actorUserId,
    });

    return appointment;
  });
}

export async function rejectAppointment(
  id: string,
  actorUserId: string,
  reasonCode: RejectionReasonCode,
  reasonNote?: string | null,
  offeredAlternatives?: unknown,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.status !== "PENDING") throw new Error("INVALID_STATUS");

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReasonCode: reasonCode,
        rejectionReason: reasonNote ?? null,
        offeredAlternatives: offeredAlternatives
          ? (offeredAlternatives as Prisma.InputJsonValue)
          : undefined,
        pendingExpiresAt: null,
      },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: offeredAlternatives ? "ALTERNATIVE_OFFERED" : "STATUS_CHANGED",
      fromStatus: "PENDING",
      toStatus: "REJECTED",
      actorUserId,
      note: reasonNote ?? reasonCode,
      metadata: { reasonCode, offeredAlternatives: offeredAlternatives ?? null },
    });

    return appointment;
  });
}

export async function offerAlternatives(
  id: string,
  actorUserId: string,
  alternatives: Array<{
    doctorId: string;
    doctorName: string;
    department: string;
    scheduledAt: string;
    reason?: string;
  }>,
  note?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.status !== "PENDING") throw new Error("INVALID_STATUS");

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        offeredAlternatives: alternatives as Prisma.InputJsonValue,
      },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "ALTERNATIVE_OFFERED",
      fromStatus: "PENDING",
      toStatus: "PENDING",
      actorUserId,
      note: note ?? "Alternative slots offered",
      metadata: { alternatives },
    });

    return appointment;
  });
}

export async function assignDoctor(
  id: string,
  doctorId: string,
  actorUserId: string,
  scheduledAt?: Date,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (!["PENDING", "CONFIRMED"].includes(existing.status)) {
      throw new Error("INVALID_STATUS");
    }

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        doctorId,
        scheduledAt: scheduledAt ?? existing.scheduledAt,
        assignedDoctorAt: new Date(),
        assignedDoctorById: actorUserId,
      },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: existing.doctorId === doctorId ? "DOCTOR_ASSIGNED" : "DOCTOR_CHANGED",
      actorUserId,
      metadata: {
        fromDoctorId: existing.doctorId,
        toDoctorId: doctorId,
        scheduledAt: (scheduledAt ?? existing.scheduledAt).toISOString(),
      },
    });

    return appointment;
  });
}

export async function requestReschedule(
  id: string,
  patientId: string,
  scheduledAt: Date,
  doctorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing || existing.patientId !== patientId) return null;
    if (!["PENDING", "CONFIRMED"].includes(existing.status)) {
      throw new Error("INVALID_STATUS");
    }

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        rescheduleRequestedAt: new Date(),
        rescheduleRequestedSlot: scheduledAt,
        rescheduleRequestedDoctorId: doctorId ?? existing.doctorId,
      },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "RESCHEDULE_REQUESTED",
      actorUserId: null,
      metadata: {
        scheduledAt: scheduledAt.toISOString(),
        doctorId: doctorId ?? existing.doctorId,
      },
    });

    return appointment;
  });
}

export async function approveReschedule(id: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (!existing.rescheduleRequestedSlot) throw new Error("NO_RESCHEDULE_REQUEST");

    const newDoctorId = existing.rescheduleRequestedDoctorId ?? existing.doctorId;
    const newSlot = existing.rescheduleRequestedSlot;

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        doctorId: newDoctorId,
        scheduledAt: newSlot,
        status: existing.status === "PENDING" ? "CONFIRMED" : existing.status,
        confirmedAt: existing.confirmedAt ?? new Date(),
        confirmedById: existing.confirmedById ?? actorUserId,
        pendingExpiresAt: null,
        rescheduleRequestedAt: null,
        rescheduleRequestedSlot: null,
        rescheduleRequestedDoctorId: null,
      },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "RESCHEDULE_APPROVED",
      fromStatus: existing.status,
      toStatus: appointment.status,
      actorUserId,
      metadata: {
        previousSlot: existing.scheduledAt.toISOString(),
        newSlot: newSlot.toISOString(),
        doctorId: newDoctorId,
      },
    });

    return appointment;
  });
}

export async function rescheduleAppointment(
  id: string,
  scheduledAt: Date,
  doctorId: string | undefined,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (["CANCELLED", "COMPLETED", "REJECTED", "EXPIRED", "NO_SHOW"].includes(existing.status)) {
      throw new Error("NOT_RESCHEDULABLE");
    }

    const targetDoctorId = doctorId ?? existing.doctorId;
    const keepPending = existing.status === "PENDING";

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        doctorId: targetDoctorId,
        scheduledAt,
        status: keepPending ? "PENDING" : "CONFIRMED",
        confirmedAt: keepPending ? existing.confirmedAt : (existing.confirmedAt ?? new Date()),
        confirmedById: keepPending
          ? existing.confirmedById
          : (existing.confirmedById ?? actorUserId),
        rescheduleRequestedAt: null,
        rescheduleRequestedSlot: null,
        rescheduleRequestedDoctorId: null,
      },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "RESCHEDULE_APPROVED",
      fromStatus: existing.status,
      toStatus: appointment.status,
      actorUserId,
      metadata: {
        previousSlot: existing.scheduledAt.toISOString(),
        newSlot: scheduledAt.toISOString(),
        doctorId: targetDoctorId,
      },
    });

    return appointment;
  });
}

export async function cancelAppointment(
  id: string,
  cancelReason: string,
  actorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (!["PENDING", "CONFIRMED", "CHECKED_IN"].includes(existing.status)) {
      throw new Error("INVALID_STATUS");
    }

    const appointment = await tx.appointment.update({
      where: { id },
      data: { status: "CANCELLED", cancelReason, pendingExpiresAt: null },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "STATUS_CHANGED",
      fromStatus: existing.status,
      toStatus: "CANCELLED",
      actorUserId,
      note: cancelReason,
    });

    return appointment;
  });
}

export async function checkInAppointment(id: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.status !== "CONFIRMED") throw new Error("INVALID_STATUS");

    const appointment = await tx.appointment.update({
      where: { id },
      data: { status: "WAITING", checkedInAt: new Date() },
      include: appointmentInclude,
    });

    await tx.patientIntake.updateMany({
      where: { appointmentId: id, lockedAt: null },
      data: { lockedAt: new Date() },
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "PATIENT_CHECKED_IN",
      fromStatus: "CONFIRMED",
      toStatus: "WAITING",
      actorUserId,
    });

    return appointment;
  });
}

export async function startConsultation(id: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (!["CHECKED_IN", "WAITING"].includes(existing.status)) {
      throw new Error("INVALID_STATUS");
    }

    const appointment = await tx.appointment.update({
      where: { id },
      data: { status: "IN_CONSULTATION", inProgressAt: new Date() },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "STATUS_CHANGED",
      fromStatus: existing.status,
      toStatus: "IN_CONSULTATION",
      actorUserId,
    });

    return appointment;
  });
}

export async function completeAppointment(id: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (!["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"].includes(existing.status)) {
      throw new Error("INVALID_STATUS");
    }

    const appointment = await tx.appointment.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "STATUS_CHANGED",
      fromStatus: existing.status,
      toStatus: "COMPLETED",
      actorUserId,
    });

    return appointment;
  });
}

export async function markNoShow(id: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id } });
    if (!existing) return null;
    if (!["CONFIRMED", "CHECKED_IN", "WAITING"].includes(existing.status)) {
      throw new Error("INVALID_STATUS");
    }

    const appointment = await tx.appointment.update({
      where: { id },
      data: { status: "NO_SHOW" },
      include: appointmentInclude,
    });

    await logAppointmentEvent(tx, {
      appointmentId: id,
      eventType: "STATUS_CHANGED",
      fromStatus: existing.status,
      toStatus: "NO_SHOW",
      actorUserId,
    });

    return appointment;
  });
}

export async function expirePendingAppointments() {
  const now = new Date();
  const due = await prisma.appointment.findMany({
    where: {
      status: "PENDING",
      pendingExpiresAt: { lte: now },
    },
    select: { id: true },
  });

  const expired = [];
  for (const row of due) {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: row.id },
        data: { status: "EXPIRED", pendingExpiresAt: null },
        include: appointmentInclude,
      });
      await logAppointmentEvent(tx, {
        appointmentId: row.id,
        eventType: "STATUS_CHANGED",
        fromStatus: "PENDING",
        toStatus: "EXPIRED",
        note: "Pending hold expired",
      });
      return updated;
    });
    expired.push(result);
  }
  return expired;
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

export async function createWalkInAppointment(input: {
  patientId: string;
  doctorId: string;
  reasonForVisit?: string | null;
  createdBy: string;
}) {
  const dayStart = startOfDay(new Date());
  const dayEnd = addMinutes(dayStart, 1440);

  return prisma.$transaction(async (tx) => {
    const maxQueue = await tx.appointment.aggregate({
      where: {
        doctorId: input.doctorId,
        scheduledAt: { gte: dayStart, lt: dayEnd },
        queueNumber: { not: null },
      },
      _max: { queueNumber: true },
    });
    const queueNumber = (maxQueue._max.queueNumber ?? 0) + 1;

    let scheduledAt = new Date();
    scheduledAt.setSeconds(0, 0);
    scheduledAt = addMinutes(scheduledAt, 1);

    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        const appointment = await tx.appointment.create({
          data: {
            patientId: input.patientId,
            doctorId: input.doctorId,
            scheduledAt,
            reasonForVisit: input.reasonForVisit ?? "Walk-in",
            durationMinutes: 15,
            createdBy: input.createdBy,
            status: "WAITING",
            priority: "NORMAL",
            appointmentSource: "WALK_IN",
            visitType: "ROUTINE",
            confirmedAt: new Date(),
            confirmedById: input.createdBy,
            checkedInAt: new Date(),
            isWalkIn: true,
            queueNumber,
          },
          include: {
            ...appointmentInclude,
            encounter: { select: { id: true, status: true } },
          },
        });

        await logAppointmentEvent(tx, {
          appointmentId: appointment.id,
          eventType: "APPOINTMENT_CREATED",
          toStatus: "WAITING",
          actorUserId: input.createdBy,
          metadata: { source: "WALK_IN" },
        });

        return appointment;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          scheduledAt = addMinutes(scheduledAt, 1);
          continue;
        }
        throw err;
      }
    }
    throw new Error("NO_FREE_SLOT");
  });
}

export async function getTodayQueue(doctorId: string, day: Date = new Date()) {
  const dayStart = startOfDay(day);
  const dayEnd = addMinutes(dayStart, 1440);

  return prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { in: DOCTOR_VISIBLE_STATUSES },
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
          department: { select: { id: true, name: true } },
          user: { select: { name: true, email: true } },
        },
      },
      encounter: { select: { id: true, status: true } },
      intake: {
        select: {
          id: true,
          isUrgent: true,
          symptomCategoryId: true,
          symptomCategory: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function pendingCounts() {
  const [urgent, expiringSoon, total] = await Promise.all([
    prisma.appointment.count({
      where: {
        status: "PENDING",
        priority: { in: ["URGENT", "EMERGENCY"] },
      },
    }),
    prisma.appointment.count({
      where: {
        status: "PENDING",
        pendingExpiresAt: { lte: addHours(new Date(), 2) },
      },
    }),
    prisma.appointment.count({ where: { status: "PENDING" } }),
  ]);
  return { urgent, expiringSoon, total };
}

export { Prisma, BLOCKING_STATUSES };
