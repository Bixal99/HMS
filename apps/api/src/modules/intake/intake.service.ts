import { pickReceptionistIntakeFields } from "@shared/auth";
import { prisma } from "../../lib/prisma";
import type { RedFlagKey } from "./redFlagKeys";

const categoryInclude = {
  suggestedDepartment: { select: { id: true, name: true } },
} as const;

const intakeFullInclude = {
  symptomCategory: {
    include: {
      suggestedDepartment: { select: { id: true, name: true } },
    },
  },
  appointment: {
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      doctorId: true,
    },
  },
} as const;

export async function listSymptomCategories() {
  return prisma.symptomCategory.findMany({
    include: categoryInclude,
    orderBy: { name: "asc" },
  });
}

export async function createSymptomCategory(input: {
  name: string;
  description?: string | null;
  suggestedDepartmentId: string;
}) {
  return prisma.symptomCategory.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      suggestedDepartmentId: input.suggestedDepartmentId,
    },
    include: categoryInclude,
  });
}

export async function updateSymptomCategory(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    suggestedDepartmentId?: string;
  },
) {
  return prisma.symptomCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.suggestedDepartmentId !== undefined
        ? { suggestedDepartmentId: input.suggestedDepartmentId }
        : {}),
    },
    include: categoryInclude,
  });
}

export async function createPatientIntake(input: {
  patientId: string;
  symptomCategoryId: string;
  chiefComplaintText: string;
  durationValue: number;
  durationUnit: string;
  severity: "MILD" | "MODERATE" | "SEVERE";
  redFlagsSelected: RedFlagKey[];
}) {
  const isUrgent = input.redFlagsSelected.length > 0;
  return prisma.patientIntake.create({
    data: {
      patientId: input.patientId,
      symptomCategoryId: input.symptomCategoryId,
      chiefComplaintText: input.chiefComplaintText,
      durationValue: input.durationValue,
      durationUnit: input.durationUnit,
      severity: input.severity,
      redFlagsSelected: input.redFlagsSelected,
      isUrgent,
    },
    include: intakeFullInclude,
  });
}

export async function getPatientIntakeById(id: string) {
  return prisma.patientIntake.findUnique({
    where: { id },
    include: intakeFullInclude,
  });
}

export async function updatePatientIntake(
  id: string,
  input: {
    symptomCategoryId?: string;
    chiefComplaintText?: string;
    durationValue?: number;
    durationUnit?: string;
    severity?: "MILD" | "MODERATE" | "SEVERE";
    redFlagsSelected?: RedFlagKey[];
  },
) {
  const existing = await prisma.patientIntake.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.lockedAt) {
    throw new Error("LOCKED");
  }

  const redFlags = input.redFlagsSelected ?? (existing.redFlagsSelected as RedFlagKey[]);
  const isUrgent = Array.isArray(redFlags) && redFlags.length > 0;

  return prisma.patientIntake.update({
    where: { id },
    data: {
      ...(input.symptomCategoryId !== undefined
        ? { symptomCategoryId: input.symptomCategoryId }
        : {}),
      ...(input.chiefComplaintText !== undefined
        ? { chiefComplaintText: input.chiefComplaintText }
        : {}),
      ...(input.durationValue !== undefined
        ? { durationValue: input.durationValue }
        : {}),
      ...(input.durationUnit !== undefined
        ? { durationUnit: input.durationUnit }
        : {}),
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.redFlagsSelected !== undefined
        ? { redFlagsSelected: input.redFlagsSelected, isUrgent }
        : {}),
    },
    include: intakeFullInclude,
  });
}

export function projectIntakeForRole(
  intake: Record<string, unknown>,
  role: string,
) {
  if (role === "RECEPTIONIST") {
    const base = pickReceptionistIntakeFields(intake);
    const category = intake.symptomCategory as
      | { id?: string; name?: string }
      | undefined;
    return {
      ...base,
      symptomCategory: category
        ? { id: category.id, name: category.name }
        : undefined,
    };
  }
  return intake;
}

async function doctorsWithAvailability(departmentId: string) {
  const doctors = await prisma.staff.findMany({
    where: {
      isActive: true,
      departmentId,
      user: { role: "DOCTOR" },
      availability: { some: {} },
    },
    select: {
      id: true,
      designation: true,
      specialization: true,
      department: { select: { id: true, name: true } },
      user: { select: { name: true } },
      availability: { take: 1 },
    },
  });
  return doctors;
}

async function nextSlotForDoctor(doctorId: string): Promise<string | null> {
  const { getAvailableSlots } = await import("../appointments/slotGenerator");
  const day = new Date();
  for (let offset = 0; offset < 14; offset++) {
    const date = new Date(day);
    date.setDate(day.getDate() + offset);
    const slots = await getAvailableSlots(doctorId, date);
    const open = slots.find((s) => s.available);
    if (open) return open.start;
  }
  return null;
}

export async function recommendDepartment(symptomCategoryId: string) {
  const category = await prisma.symptomCategory.findUnique({
    where: { id: symptomCategoryId },
    include: { suggestedDepartment: { select: { id: true, name: true } } },
  });
  if (!category) throw new Error("CATEGORY_NOT_FOUND");

  const fallback = await prisma.department.findFirst({
    where: { name: "General Medicine" },
    select: { id: true, name: true },
  });

  let suggested = category.suggestedDepartment;
  let fallbackUsed = false;
  let fallbackReason: string | null = null;
  let confidence = 0.86;

  let docs = await doctorsWithAvailability(suggested.id);
  if (docs.length === 0 && fallback && fallback.id !== suggested.id) {
    fallbackUsed = true;
    fallbackReason = `No ${suggested.name} appointments are currently available. A ${fallback.name} physician can perform the initial assessment and refer you if needed.`;
    suggested = fallback;
    confidence = 0.55;
    docs = await doctorsWithAvailability(fallback.id);
  }

  const doctors = [];
  for (const d of docs.slice(0, 5)) {
    const nextSlotAt = await nextSlotForDoctor(d.id);
    doctors.push({
      id: d.id,
      name: d.user.name ?? d.designation,
      designation: d.designation,
      specialization: d.specialization,
      department: d.department,
      nextSlotAt,
    });
  }

  return {
    suggestedDepartment: suggested,
    confidence,
    fallbackUsed,
    fallbackReason,
    doctors,
  };
}

