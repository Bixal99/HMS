import path from "path";
import { prisma } from "../../lib/prisma";
import type { BloodGroup, Gender } from "../../generated/prisma/client";
import type { CreatePatientInput, UpdatePatientInput } from "./patients.validators";
import { pickBillingPatientFields } from "@shared/auth";

function emptyToNull(value?: string) {
  if (value === undefined || value === "") return null;
  return value;
}

export async function generateMrn(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MRN-${year}-`;
  const count = await prisma.patient.count({
    where: { mrn: { startsWith: prefix } },
  });
  const sequence = String(count + 1).padStart(5, "0");
  return `${prefix}${sequence}`;
}

export async function listPatients(opts: {
  page: number;
  pageSize: number;
  q: string;
  role: string;
}) {
  const { page, pageSize, q, role } = opts;
  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { mrn: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include:
        role === "BILLING_OFFICER"
          ? undefined
          : {
              allergies: {
                where: { severity: "SEVERE" },
                select: { id: true, allergen: true, severity: true },
              },
            },
    }),
  ]);

  const data =
    role === "BILLING_OFFICER"
      ? rows.map((p) => pickBillingPatientFields(p as unknown as Record<string, unknown>))
      : rows;

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function createPatient(input: CreatePatientInput) {
  const mrn = await generateMrn();
  return prisma.patient.create({
    data: {
      mrn,
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob,
      gender: input.gender as Gender,
      phone: input.phone,
      email: emptyToNull(input.email),
      address: emptyToNull(input.address),
      bloodGroup: (input.bloodGroup ?? "UNKNOWN") as BloodGroup,
      emergencyName: emptyToNull(input.emergencyName),
      emergencyPhone: emptyToNull(input.emergencyPhone),
      emergencyRelation: emptyToNull(input.emergencyRelation),
      insuranceProvider: emptyToNull(input.insuranceProvider),
      insurancePolicyNo: emptyToNull(input.insurancePolicyNo),
    },
  });
}

export async function getPatientById(id: string, role: string) {
  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    include: {
      allergies: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!patient) return null;

  if (role === "BILLING_OFFICER") {
    return pickBillingPatientFields(patient as unknown as Record<string, unknown>);
  }

  return patient;
}

export async function getPatientTimeline(id: string) {
  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, createdAt: true },
  });
  if (!patient) return null;

  return {
    patientId: patient.id,
    registeredAt: patient.createdAt,
    // TODO: Task 05/06 — Appointments / Encounters
    appointments: [] as unknown[],
    encounters: [] as unknown[],
    invoices: await prisma.invoice.findMany({
      where: { patientId: patient.id },
      select: {
        id: true,
        status: true,
        totalCents: true,
        createdAt: true,
        issuedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  };
}

export async function updatePatient(id: string, input: UpdatePatientInput, role: string) {
  const existing = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  const updated = await prisma.patient.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.dob !== undefined ? { dob: input.dob } : {}),
      ...(input.gender !== undefined ? { gender: input.gender as Gender } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: emptyToNull(input.email) } : {}),
      ...(input.address !== undefined ? { address: emptyToNull(input.address) } : {}),
      ...(input.bloodGroup !== undefined
        ? { bloodGroup: input.bloodGroup as BloodGroup }
        : {}),
      ...(input.emergencyName !== undefined
        ? { emergencyName: emptyToNull(input.emergencyName) }
        : {}),
      ...(input.emergencyPhone !== undefined
        ? { emergencyPhone: emptyToNull(input.emergencyPhone) }
        : {}),
      ...(input.emergencyRelation !== undefined
        ? { emergencyRelation: emptyToNull(input.emergencyRelation) }
        : {}),
      ...(input.insuranceProvider !== undefined
        ? { insuranceProvider: emptyToNull(input.insuranceProvider) }
        : {}),
      ...(input.insurancePolicyNo !== undefined
        ? { insurancePolicyNo: emptyToNull(input.insurancePolicyNo) }
        : {}),
    },
    include: {
      allergies: true,
      documents: true,
    },
  });

  if (role === "BILLING_OFFICER") {
    return pickBillingPatientFields(updated as unknown as Record<string, unknown>);
  }

  return updated;
}

export async function softDeletePatient(id: string) {
  const existing = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;
  return prisma.patient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function addAllergy(
  patientId: string,
  input: { allergen: string; severity: "MILD" | "MODERATE" | "SEVERE"; notes?: string },
) {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, deletedAt: null } });
  if (!patient) return null;

  return prisma.patientAllergy.create({
    data: {
      patientId,
      allergen: input.allergen,
      severity: input.severity,
      notes: emptyToNull(input.notes),
    },
  });
}

export async function addDocument(opts: {
  patientId: string;
  uploadedBy: string;
  fileUrl: string;
  docType: string;
}) {
  const patient = await prisma.patient.findFirst({
    where: { id: opts.patientId, deletedAt: null },
  });
  if (!patient) return null;

  return prisma.patientDocument.create({
    data: {
      patientId: opts.patientId,
      uploadedBy: opts.uploadedBy,
      fileUrl: opts.fileUrl,
      docType: opts.docType,
    },
  });
}

export function toPublicFileUrl(absoluteOrRelative: string) {
  const normalized = absoluteOrRelative.replace(/\\/g, "/");
  const marker = "uploads/";
  const idx = normalized.indexOf(marker);
  if (idx >= 0) return `/${normalized.slice(idx)}`;
  return `/uploads/${path.basename(normalized)}`;
}
