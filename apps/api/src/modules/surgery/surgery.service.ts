import { parseISO } from "date-fns";
import { prisma } from "../../lib/prisma";
import {
  emitSurgeryCompleted,
  emitSurgeryRequested,
  emitSurgeryScheduled,
} from "../../lib/socket";
import { getSetting } from "../settings/settings.service";

const STATUS_ORDER: Record<string, number> = {
  REQUESTED: 0,
  SCHEDULED: 1,
  COMPLETED: 2,
};

export async function createSurgeryRequest(input: {
  patientId: string;
  encounterId?: string | null;
  procedureName: string;
  urgency?: "ELECTIVE" | "URGENT" | "EMERGENCY";
  feeCents?: number | null;
  requestedBy: string;
}) {
  const defaultFee = await getSetting<number>("billing.defaultSurgeryFeeCents");
  const feeCents = input.feeCents ?? defaultFee;

  const request = await prisma.surgeryRequest.create({
    data: {
      patientId: input.patientId,
      encounterId: input.encounterId ?? null,
      procedureName: input.procedureName,
      urgency: input.urgency ?? "ELECTIVE",
      feeCents,
      requestedBy: input.requestedBy,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
    },
  });

  emitSurgeryRequested({
    requestId: request.id,
    patientName: `${request.patient.firstName} ${request.patient.lastName}`,
    procedureName: request.procedureName,
  });

  return request;
}

export async function getSurgeryBoard() {
  const requests = await prisma.surgeryRequest.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      requestedByStaff: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
      primarySurgeon: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  return requests.sort((a, b) => {
    const statusDiff =
      (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;

    const aStart = a.scheduledStart?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bStart = b.scheduledStart?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aStart - bStart;
  });
}

export async function scheduleSurgeryRequest(
  requestId: string,
  input: {
    orRoom: string;
    scheduledStart: string;
    scheduledEnd: string;
    primarySurgeonId: string;
    scheduleNotes?: string | null;
  },
) {
  const request = await prisma.surgeryRequest.update({
    where: { id: requestId },
    data: {
      status: "SCHEDULED",
      orRoom: input.orRoom,
      scheduledStart: parseISO(input.scheduledStart),
      scheduledEnd: parseISO(input.scheduledEnd),
      primarySurgeonId: input.primarySurgeonId,
      scheduleNotes: input.scheduleNotes ?? null,
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  emitSurgeryScheduled({
    requestId: request.id,
    surgeonId: input.primarySurgeonId,
    patientName: `${request.patient.firstName} ${request.patient.lastName}`,
    scheduledStart: request.scheduledStart!.toISOString(),
  });

  return request;
}

export async function completeSurgeryRequest(
  requestId: string,
  operativeNotes: string,
) {
  const existing = await prisma.surgeryRequest.findUniqueOrThrow({
    where: { id: requestId },
  });
  if (existing.status === "CANCELLED") throw new Error("CANCELLED");
  if (existing.status === "COMPLETED") throw new Error("ALREADY_COMPLETED");

  const request = await prisma.surgeryRequest.update({
    where: { id: requestId },
    data: {
      status: "COMPLETED",
      operativeNotes,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  emitSurgeryCompleted({
    requestId: request.id,
    patientId: request.patientId,
    patientName: `${request.patient.firstName} ${request.patient.lastName}`,
  });

  return request;
}

export async function cancelSurgeryRequest(requestId: string) {
  const existing = await prisma.surgeryRequest.findUniqueOrThrow({
    where: { id: requestId },
  });
  if (existing.status === "COMPLETED") throw new Error("ALREADY_COMPLETED");
  if (existing.status === "CANCELLED") throw new Error("ALREADY_CANCELLED");

  return prisma.surgeryRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });
}

export async function listPatientSurgeries(patientId: string) {
  const surgeries = await prisma.surgeryRequest.findMany({
    where: { patientId, status: "COMPLETED" },
    orderBy: { scheduledStart: "desc" },
    select: {
      id: true,
      procedureName: true,
      scheduledStart: true,
      operativeNotes: true,
    },
  });

  return surgeries.map((s) => ({
    id: s.id,
    procedureName: s.procedureName,
    scheduledStart: s.scheduledStart,
    operativeNotesSummary: s.operativeNotes
      ? s.operativeNotes.length > 200
        ? `${s.operativeNotes.slice(0, 197)}...`
        : s.operativeNotes
      : null,
  }));
}
