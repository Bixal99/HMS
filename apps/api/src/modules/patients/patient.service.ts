import prisma from "../../lib/prisma";
import { CreatePatientInput, UpdatePatientInput, PaginationInput, Role } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { Prisma } from "@prisma/client";

export class PatientService {
  private static generateMRN(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `MRN-${timestamp}-${random}`;
  }

  static async createPatient(data: CreatePatientInput) {
    const mrn = this.generateMRN();

    const patient = await prisma.patient.create({
      data: {
        mrn,
        firstName: data.firstName,
        lastName: data.lastName,
        dob: new Date(data.dob),
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        phone: data.phone,
        email: data.email,
        address: data.address,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        insuranceProvider: data.insuranceProvider,
        insurancePolicyNo: data.insurancePolicyNo,
      },
    });

    return patient;
  }

  static async getPatients(query: PaginationInput) {
    const { page, limit, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = search
      ? {
          OR: [
            { mrn: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
          deletedAt: null,
        }
      : { deletedAt: null };

    const orderBy: Prisma.PatientOrderByWithRelationInput = {};
    if (sortBy) {
      if (sortBy === "name") {
        orderBy.lastName = sortOrder;
      } else {
        orderBy[sortBy as keyof Prisma.PatientOrderByWithRelationInput] = sortOrder;
      }
    } else {
      orderBy.createdAt = "desc";
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    return {
      data: patients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getPatientById(id: string) {
    const patient = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        allergies: true,
        appointments: {
          where: { scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: "asc" },
          take: 5,
        },
        encounters: {
          orderBy: { encounterDate: "desc" },
          take: 5,
        },
      },
    });

    if (!patient) {
      throw new AppError("Patient not found", 404);
    }

    return patient;
  }

  static async updatePatient(id: string, data: UpdatePatientInput) {
    const existing = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError("Patient not found", 404);
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...data,
        dob: data.dob ? new Date(data.dob) : undefined,
      },
    });

    return updated;
  }
}
