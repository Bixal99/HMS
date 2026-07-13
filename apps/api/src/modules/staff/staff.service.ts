import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
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

export async function listStaff(filters: {
  departmentId?: string;
  specialization?: string;
}) {
  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.specialization
        ? { specialization: { contains: filters.specialization, mode: "insensitive" } }
        : {}),
    },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
      department: true,
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
      specialization: s.specialization,
      department: s.department,
      user: s.user,
      availableToday,
      todayBlocks,
    };
  });
}

export async function createStaff(input: CreateStaffInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        name: input.name,
      },
    });
    return tx.staff.create({
      data: {
        userId: user.id,
        employeeCode: input.employeeCode,
        departmentId: input.departmentId,
        designation: input.designation,
        specialization: input.specialization || null,
      },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        department: true,
      },
    });
  });
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
