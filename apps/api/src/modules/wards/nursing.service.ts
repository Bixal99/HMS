import { prisma } from "../../lib/prisma";
import { emitNursingUrgentNote } from "../../lib/socket";

export async function listActiveAdmissions() {
  return prisma.admission.findMany({
    where: { dischargedAt: null },
    orderBy: { admittedAt: "desc" },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, mrn: true },
      },
      bed: { include: { ward: { select: { id: true, name: true, floor: true } } } },
    },
  });
}

export async function updateCarePlan(admissionId: string, carePlan: string) {
  return prisma.admission.update({
    where: { id: admissionId },
    data: { carePlan },
  });
}

export async function listNursingNotes(admissionId: string) {
  return prisma.nursingNote.findMany({
    where: { admissionId },
    orderBy: { createdAt: "desc" },
  });
}

async function findDoctorForUrgentNote(patientId: string): Promise<string | null> {
  const latestEncounter = await prisma.encounter.findFirst({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    select: { doctorId: true },
  });
  if (latestEncounter?.doctorId) return latestEncounter.doctorId;

  const recentDoctor = await prisma.staff.findFirst({
    where: { isActive: true, user: { role: "DOCTOR" } },
    orderBy: { dateJoined: "desc" },
    select: { id: true },
  });
  return recentDoctor?.id ?? null;
}

export async function createNursingNote(
  admissionId: string,
  authorId: string,
  body: string,
  isUrgent?: boolean,
) {
  const admission = await prisma.admission.findUniqueOrThrow({
    where: { id: admissionId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const note = await prisma.nursingNote.create({
    data: {
      admissionId,
      authorId,
      body,
      isUrgent: isUrgent ?? false,
    },
  });

  if (note.isUrgent) {
    const doctorId = await findDoctorForUrgentNote(admission.patientId);
    emitNursingUrgentNote({
      admissionId,
      doctorId,
      patientName: `${admission.patient.firstName} ${admission.patient.lastName}`,
      preview: body.length > 120 ? `${body.slice(0, 117)}...` : body,
    });
  }

  return note;
}

export async function listMedicationAdministrations(admissionId: string) {
  return prisma.medicationAdministration.findMany({
    where: { admissionId },
    orderBy: { givenAt: "desc" },
    include: {
      prescriptionItem: {
        select: { id: true, dosage: true, frequency: true },
      },
    },
  });
}

export async function recordMedicationAdministration(
  admissionId: string,
  givenBy: string,
  input: {
    prescriptionItemId?: string | null;
    medicineName: string;
    dose: string;
    route: string;
    notes?: string | null;
  },
) {
  return prisma.medicationAdministration.create({
    data: {
      admissionId,
      givenBy,
      prescriptionItemId: input.prescriptionItemId ?? null,
      medicineName: input.medicineName,
      dose: input.dose,
      route: input.route,
      notes: input.notes ?? null,
    },
  });
}

export async function getMarSuggestions(admissionId: string) {
  const admission = await prisma.admission.findUniqueOrThrow({
    where: { id: admissionId },
    select: { patientId: true },
  });

  return prisma.prescriptionItem.findMany({
    where: {
      prescription: {
        patientId: admission.patientId,
        status: "PENDING",
      },
    },
    include: {
      medicine: {
        select: { id: true, name: true, strength: true, form: true },
      },
      prescription: {
        select: { id: true, createdAt: true, doctorId: true },
      },
    },
    orderBy: { prescription: { createdAt: "desc" } },
  });
}
