import { prisma } from "../../lib/prisma";

const encounterDetailInclude = {
  patient: {
    include: {
      allergies: true,
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
  appointment: {
    select: { id: true, scheduledAt: true, status: true, reasonForVisit: true },
  },
  diagnoses: true,
  vitals: { orderBy: { recordedAt: "desc" as const } },
  prescriptions: {
    include: {
      items: { include: { medicine: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  revisions: { orderBy: { createdAt: "desc" as const }, take: 20 },
} as const;

export async function startEncounter(appointmentId: string, doctorId: string) {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
  });

  if (appointment.doctorId !== doctorId) {
    throw new Error("FORBIDDEN");
  }
  if (!["CHECKED_IN", "IN_PROGRESS"].includes(appointment.status)) {
    throw new Error("INVALID_STATUS");
  }

  const existing = await prisma.encounter.findUnique({
    where: { appointmentId },
  });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const encounter = await tx.encounter.create({
      data: {
        patientId: appointment.patientId,
        doctorId,
        appointmentId,
        chiefComplaint: appointment.reasonForVisit,
      },
      include: encounterDetailInclude,
    });
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "IN_PROGRESS", inProgressAt: new Date() },
    });
    return encounter;
  });
}

export async function getEncounter(id: string) {
  return prisma.encounter.findUnique({
    where: { id },
    include: encounterDetailInclude,
  });
}

export async function getPatientContext(patientId: string) {
  const [allergies, lastVitals, activeMeds] = await Promise.all([
    prisma.patientAllergy.findMany({ where: { patientId } }),
    prisma.vitals.findFirst({
      where: { encounter: { patientId } },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.prescription.findMany({
      where: { patientId, status: "PENDING" },
      include: { items: { include: { medicine: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  return { allergies, lastVitals, activeMeds };
}

export async function updateEncounterNotes(
  encounterId: string,
  updatedBy: string,
  fields: {
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
    chiefComplaint?: string | null;
  },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.encounter.findUniqueOrThrow({
      where: { id: encounterId },
    });

    const isAddendum = current.status === "FINALIZED";
    await tx.encounterRevision.create({
      data: {
        encounterId,
        subjective: current.subjective,
        objective: current.objective,
        assessment: current.assessment,
        plan: current.plan,
        revisedBy: updatedBy,
        isAddendum,
      },
    });

    return tx.encounter.update({
      where: { id: encounterId },
      data: fields,
      include: encounterDetailInclude,
    });
  });
}

export async function finalizeEncounter(encounterId: string, doctorId: string) {
  const result = await prisma.encounter.updateMany({
    where: { id: encounterId, doctorId, status: "IN_PROGRESS" },
    data: { status: "FINALIZED", finalizedAt: new Date() },
  });
  if (result.count === 0) {
    const existing = await prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!existing) throw new Error("NOT_FOUND");
    if (existing.doctorId !== doctorId) throw new Error("FORBIDDEN");
    throw new Error("ALREADY_FINALIZED");
  }
  return getEncounter(encounterId);
}

export async function addVitals(
  encounterId: string,
  recordedBy: string,
  data: {
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    temperatureC?: number | null;
    pulseBpm?: number | null;
    weightKg?: number | null;
    heightCm?: number | null;
  },
) {
  return prisma.vitals.create({
    data: {
      encounterId,
      recordedBy,
      bpSystolic: data.bpSystolic ?? null,
      bpDiastolic: data.bpDiastolic ?? null,
      temperatureC: data.temperatureC ?? null,
      pulseBpm: data.pulseBpm ?? null,
      weightKg: data.weightKg ?? null,
      heightCm: data.heightCm ?? null,
    },
  });
}

export async function addDiagnosis(
  encounterId: string,
  data: { icdCode?: string | null; description: string },
) {
  return prisma.diagnosis.create({
    data: {
      encounterId,
      icdCode: data.icdCode ?? null,
      description: data.description,
    },
  });
}

export async function createPrescription(input: {
  encounterId: string;
  patientId: string;
  doctorId: string;
  items: Array<{
    medicineId: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    quantityPrescribed: number;
    notes?: string | null;
  }>;
}) {
  return prisma.prescription.create({
    data: {
      encounterId: input.encounterId,
      patientId: input.patientId,
      doctorId: input.doctorId,
      pharmacyStage: "PENDING_REVIEW",
      items: {
        create: input.items.map((item) => ({
          medicineId: item.medicineId,
          dosage: item.dosage,
          frequency: item.frequency,
          durationDays: item.durationDays,
          quantityPrescribed: item.quantityPrescribed,
          notes: item.notes ?? null,
        })),
      },
    },
    include: { items: { include: { medicine: true } } },
  });
}

export async function listRevisions(encounterId: string) {
  return prisma.encounterRevision.findMany({
    where: { encounterId },
    orderBy: { createdAt: "asc" },
  });
}

export async function listEncountersForPatient(patientId: string) {
  return prisma.encounter.findMany({
    where: { patientId },
    orderBy: { encounterDate: "desc" },
    select: {
      id: true,
      encounterDate: true,
      status: true,
      chiefComplaint: true,
      finalizedAt: true,
      doctor: {
        select: {
          designation: true,
          user: { select: { name: true } },
        },
      },
    },
  });
}

export async function searchMedicines(q: string) {
  if (!q.trim()) {
    return prisma.medicine.findMany({ take: 20, orderBy: { name: "asc" } });
  }
  return prisma.medicine.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { genericName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
  });
}
