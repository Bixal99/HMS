import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../lib/email";
import { staffInviteEmail } from "../../lib/staff-invite-email";
import { getSetting } from "../settings/settings.service";
import type { z } from "zod";
import type {
  createLeaveSchema,
  createStaffSchema,
  replaceAvailabilitySchema,
} from "./staff.validators";

type CreateStaffInput = z.infer<typeof createStaffSchema>;
type ReplaceAvailabilityInput = z.infer<typeof replaceAvailabilitySchema>;
type CreateLeaveInput = z.infer<typeof createLeaveSchema>;

function todayDayOfWeek() {
  return new Date().getDay();
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Cryptographically random temp password — not derived from email/name. */
export function generateSecureTempPassword(byteLength = 18): string {
  return randomBytes(byteLength).toString("base64url").slice(0, 24);
}

function roleSpecificStaffData(input: CreateStaffInput) {
  switch (input.role) {
    case "DOCTOR":
      return {
        specialtyId: input.specialtyId,
        licenseNumber: input.licenseNumber,
        qualification: input.qualification,
        experienceYears: input.experienceYears,
        consultationRoom: input.consultationRoom ?? null,
        consultationFeeCents: input.consultationFeeCents ?? null,
      };
    case "NURSE":
      return {
        wardId: input.wardId,
        shiftPattern: input.shiftPattern,
      };
    case "RECEPTIONIST":
      return {
        shiftPattern: input.shiftPattern,
      };
    case "PHARMACIST":
      return {
        licenseNumber: input.licenseNumber,
      };
    case "LAB_TECHNICIAN":
      return {
        qualification: input.qualification,
      };
    default:
      return {};
  }
}

export async function listStaff(filters: {
  departmentId?: string;
  specialization?: string;
  specialtyId?: string;
}) {
  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.specialtyId ? { specialtyId: filters.specialtyId } : {}),
      ...(filters.specialization
        ? {
            OR: [
              {
                specialization: {
                  contains: filters.specialization,
                  mode: "insensitive",
                },
              },
              {
                specialty: {
                  name: {
                    contains: filters.specialization,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
      department: true,
      specialty: true,
      availability: true,
    },
    orderBy: { employeeCode: "asc" },
  });

  const day = todayDayOfWeek();
  const now = nowHHMM();

  return staff.map((s) => {
    const todayBlocks = s.availability.filter((a) => a.dayOfWeek === day);
    const availableToday = todayBlocks.some(
      (b) => b.startTime <= now && b.endTime > now,
    );
    return {
      id: s.id,
      employeeCode: s.employeeCode,
      designation: s.designation,
      specialization: s.specialty?.name ?? s.specialization,
      specialty: s.specialty,
      consultationFeeCents: s.consultationFeeCents,
      department: s.department,
      user: s.user,
      availableToday,
      todayBlocks,
    };
  });
}

export async function createStaff(input: CreateStaffInput) {
  const tempPassword = generateSecureTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const roleFields = roleSpecificStaffData(input);

  const staff = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        name: input.name,
        mustChangePassword: true,
      },
    });
    return tx.staff.create({
      data: {
        userId: user.id,
        employeeCode: input.employeeCode,
        departmentId: input.departmentId,
        designation: input.designation,
        ...roleFields,
      },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        department: true,
        specialty: true,
      },
    });
  });

  const hospitalName = await getSetting<string>("hospital.name").catch(
    () => "MediCore",
  );
  const invite = staffInviteEmail({
    name: input.name,
    tempPassword,
    hospitalName,
  });
  await sendEmail({
    to: input.email,
    subject: invite.subject,
    text: invite.text,
  });

  return staff;
}

export async function getAvailability(staffId: string) {
  return prisma.staffAvailability.findMany({
    where: { staffId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function replaceAvailability(
  staffId: string,
  input: ReplaceAvailabilityInput,
) {
  return prisma.$transaction(async (tx) => {
    await tx.staffAvailability.deleteMany({ where: { staffId } });
    if (input.blocks.length === 0) return [];
    await tx.staffAvailability.createMany({
      data: input.blocks.map((b) => ({
        staffId,
        dayOfWeek: b.dayOfWeek,
        startTime: b.startTime,
        endTime: b.endTime,
        slotDurationMins: b.slotDurationMins ?? 15,
      })),
    });
    return tx.staffAvailability.findMany({
      where: { staffId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  });
}

export async function createLeaveRequest(staffId: string, input: CreateLeaveInput) {
  return prisma.staffLeaveRequest.create({
    data: {
      staffId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
    },
  });
}

export async function listLeaveRequests(status?: "PENDING" | "APPROVED" | "REJECTED") {
  return prisma.staffLeaveRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      staff: {
        include: {
          user: { select: { name: true, email: true } },
          department: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function patchLeaveRequest(
  id: string,
  status: "APPROVED" | "REJECTED",
  approvedBy: string,
) {
  return prisma.staffLeaveRequest.update({
    where: { id },
    data: { status, approvedBy },
  });
}

export async function countPendingLeave() {
  return prisma.staffLeaveRequest.count({ where: { status: "PENDING" } });
}

export async function findStaffByUserId(userId: string) {
  return prisma.staff.findUnique({ where: { userId } });
}

export async function listDepartments() {
  return prisma.department.findMany({ orderBy: { name: "asc" } });
}
