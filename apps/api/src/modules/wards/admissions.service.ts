import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { getIO } from "../../lib/socket";

export class BedUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BedUnavailableError";
  }
}

function isPrismaUniqueConstraintError(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export function emitBedStatusChanged(payload: {
  bedId: string;
  wardId: string;
  status: string;
  admissionId?: string | null;
  patientId?: string | null;
}) {
  try {
    getIO().to("staff:all").emit("ward:bed_status_changed", payload);
  } catch {
    // Socket may be unavailable in offline scripts / early boot
  }
}

export async function getOccupancy() {
  const wards = await prisma.ward.findMany({
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    include: {
      department: { select: { id: true, name: true } },
      beds: {
        orderBy: { bedNumber: "asc" },
        include: {
          admissions: {
            where: { dischargedAt: null },
            take: 1,
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  mrn: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return wards.map((ward) => ({
    ...ward,
    beds: ward.beds.map((bed) => ({
      ...bed,
      activeAdmission: bed.admissions[0] ?? null,
      admissions: undefined,
    })),
  }));
}

export async function getWardBeds(wardId: string) {
  return prisma.bed.findMany({
    where: { wardId },
    orderBy: { bedNumber: "asc" },
    include: {
      admissions: {
        where: { dischargedAt: null },
        take: 1,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrn: true },
          },
        },
      },
    },
  });
}

export async function admitPatient(
  patientId: string,
  bedId: string,
  admittedBy: string,
  expectedDischargeAt?: Date | null,
) {
  try {
    const admission = await prisma.$transaction(async (tx) => {
      const bed = await tx.bed.findUniqueOrThrow({ where: { id: bedId } });
      if (bed.status !== "AVAILABLE") {
        throw new BedUnavailableError("Bed is not available");
      }

      const existingPatientAdmission = await tx.admission.findFirst({
        where: { patientId, dischargedAt: null },
      });
      if (existingPatientAdmission) {
        throw new BedUnavailableError("Patient already has an active admission");
      }

      const created = await tx.admission.create({
        data: {
          patientId,
          bedId,
          admittedBy,
          expectedDischargeAt: expectedDischargeAt ?? null,
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrn: true },
          },
          bed: true,
        },
      });
      await tx.bed.update({ where: { id: bedId }, data: { status: "OCCUPIED" } });
      return created;
    });

    emitBedStatusChanged({
      bedId: admission.bedId,
      wardId: admission.bed.wardId,
      status: "OCCUPIED",
      admissionId: admission.id,
      patientId: admission.patientId,
    });

    return admission;
  } catch (err) {
    if (err instanceof BedUnavailableError) throw err;
    if (isPrismaUniqueConstraintError(err)) {
      throw new BedUnavailableError("This bed was just taken by another admission.");
    }
    throw err;
  }
}

export async function getDischargeChecklist(admissionId: string) {
  const admission = await prisma.admission.findUniqueOrThrow({
    where: { id: admissionId },
  });

  const pendingLabResults = await prisma.labOrderItem.count({
    where: {
      labOrder: { patientId: admission.patientId },
      status: { not: "RESULTED" },
    },
  });

  const openInvoices = await prisma.invoice.findMany({
    where: {
      patientId: admission.patientId,
      status: { in: ["DRAFT", "ISSUED", "PARTIALLY_PAID"] },
    },
    select: { id: true, status: true, totalCents: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    pendingLabResults: { count: pendingLabResults, blocking: pendingLabResults > 0 },
    outstandingInvoice: {
      available: true,
      count: openInvoices.length,
      blocking: false,
      invoices: openInvoices,
      note:
        openInvoices.length > 0
          ? `${openInvoices.length} open invoice(s) — settle at billing desk after discharge`
          : "No open invoices",
    },
    medicationReconciliation: { requiresManualAck: true },
  };
}

export async function dischargePatient(
  admissionId: string,
  dischargeSummary: string,
  opts: { medicationReconciled: boolean; overrideReason?: string | null },
) {
  if (!opts.medicationReconciled) {
    throw new Error("MEDS_NOT_ACKED");
  }

  const checklist = await getDischargeChecklist(admissionId);
  if (checklist.pendingLabResults.blocking && !opts.overrideReason?.trim()) {
    throw new Error("LABS_BLOCKING");
  }

  const result = await prisma.$transaction(async (tx) => {
    const admission = await tx.admission.findUniqueOrThrow({
      where: { id: admissionId },
      include: { bed: true },
    });
    if (admission.dischargedAt) throw new Error("ALREADY_DISCHARGED");

    const summary =
      checklist.pendingLabResults.blocking && opts.overrideReason
        ? `${dischargeSummary}\n\n[Override pending labs: ${opts.overrideReason}]`
        : dischargeSummary;

    const updated = await tx.admission.update({
      where: { id: admissionId },
      data: { dischargedAt: new Date(), dischargeSummary: summary },
      include: { bed: true, patient: true },
    });
    await tx.bed.update({
      where: { id: admission.bedId },
      data: { status: "AVAILABLE" },
    });
    return updated;
  });

  emitBedStatusChanged({
    bedId: result.bedId,
    wardId: result.bed.wardId,
    status: "AVAILABLE",
    admissionId: result.id,
    patientId: result.patientId,
  });

  return result;
}

export async function transferBed(
  admissionId: string,
  toBedId: string,
  reason: string,
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findUniqueOrThrow({
        where: { id: admissionId },
        include: { bed: true },
      });
      if (admission.dischargedAt) throw new Error("ALREADY_DISCHARGED");

      const toBed = await tx.bed.findUniqueOrThrow({ where: { id: toBedId } });
      if (toBed.status !== "AVAILABLE") {
        throw new BedUnavailableError("Target bed is not available");
      }

      const fromBedId = admission.bedId;
      const fromWardId = admission.bed.wardId;

      await tx.bed.update({
        where: { id: fromBedId },
        data: { status: "AVAILABLE" },
      });
      await tx.bed.update({
        where: { id: toBedId },
        data: { status: "OCCUPIED" },
      });
      const updated = await tx.admission.update({
        where: { id: admissionId },
        data: { bedId: toBedId },
        include: {
          bed: true,
          patient: {
            select: { id: true, firstName: true, lastName: true, mrn: true },
          },
        },
      });
      await tx.bedTransfer.create({
        data: { admissionId, fromBedId, toBedId, reason },
      });

      return { updated, fromBedId, fromWardId, toWardId: toBed.wardId };
    });

    emitBedStatusChanged({
      bedId: result.fromBedId,
      wardId: result.fromWardId,
      status: "AVAILABLE",
      admissionId: null,
      patientId: null,
    });
    emitBedStatusChanged({
      bedId: result.updated.bedId,
      wardId: result.toWardId,
      status: "OCCUPIED",
      admissionId: result.updated.id,
      patientId: result.updated.patientId,
    });

    return result.updated;
  } catch (err) {
    if (err instanceof BedUnavailableError) throw err;
    if (isPrismaUniqueConstraintError(err)) {
      throw new BedUnavailableError("Target bed was just taken by another admission.");
    }
    throw err;
  }
}

export async function updateBedStatus(
  bedId: string,
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE",
) {
  const bed = await prisma.bed.findUniqueOrThrow({ where: { id: bedId } });
  if (status === "AVAILABLE") {
    const active = await prisma.admission.findFirst({
      where: { bedId, dischargedAt: null },
    });
    if (active) throw new BedUnavailableError("Cannot mark bed available while occupied");
  }
  const updated = await prisma.bed.update({
    where: { id: bedId },
    data: { status },
  });
  emitBedStatusChanged({
    bedId: updated.id,
    wardId: updated.wardId,
    status: updated.status,
  });
  return updated;
}

export async function getAdmission(id: string) {
  return prisma.admission.findUnique({
    where: { id },
    include: {
      patient: true,
      bed: { include: { ward: true } },
      transfers: { orderBy: { transferredAt: "desc" } },
    },
  });
}
