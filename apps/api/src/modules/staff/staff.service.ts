import prisma from "../../lib/prisma";
import { CreateStaffInput, PaginationInput } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

export class StaffService {
  private static generateEmployeeCode(): string {
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `EMP-${random}`;
  }

  static async createStaff(data: CreateStaffInput) {
    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Email is already in use", 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const employeeCode = this.generateEmployeeCode();

    // Use a transaction to create User and Staff linked together
    const result = await prisma.$transaction(async (tx) => {
      // Ensure at least one department exists for testing/MVP
      let department = await tx.department.findFirst();
      if (!department) {
        department = await tx.department.create({
          data: { name: "General Medicine", description: "Default Department" },
        });
      }

      const user = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          passwordHash,
          phone: data.phone,
          role: data.role,
        },
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          employeeCode,
          departmentId: department.id,
          designation: data.designation,
          specialization: data.specialization,
        },
        include: {
          department: true,
        },
      });

      return { user, staff };
    });

    // Strip password hash from response
    const { passwordHash: _, ...userWithoutPassword } = result.user;
    return { ...result.staff, user: userWithoutPassword };
  }

  static async getStaff(query: PaginationInput & { role?: string; departmentId?: string }) {
    const { page, limit, search, role, departmentId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StaffWhereInput = {
      isActive: true,
      ...(departmentId && { departmentId }),
      ...(role && { user: { role } }),
      ...(search && {
        OR: [
          { employeeCode: { contains: search, mode: "insensitive" } },
          { user: { firstName: { contains: search, mode: "insensitive" } } },
          { user: { lastName: { contains: search, mode: "insensitive" } } },
          { specialization: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, staff] = await Promise.all([
      prisma.staff.count({ where }),
      prisma.staff.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
          },
          department: true,
        },
        orderBy: { dateJoined: "desc" },
      }),
    ]);

    return {
      data: staff,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getStaffById(id: string) {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
        },
        department: true,
        availability: {
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    if (!staff) {
      throw new AppError("Staff not found", 404);
    }

    return staff;
  }
}
