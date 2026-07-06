import prisma from "../../lib/prisma";
import { CreateAppointmentInput, PaginationInput, UpdateAppointmentStatusInput } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { Prisma } from "@prisma/client";

export class AppointmentService {
  static async createAppointment(data: CreateAppointmentInput, scheduledBy: string) {
    // Basic validation to check if the doctor and patient exist
    const [patient, doctor, department] = await Promise.all([
      prisma.patient.findUnique({ where: { id: data.patientId } }),
      prisma.staff.findUnique({ where: { id: data.doctorId } }),
      prisma.department.findUnique({ where: { id: data.departmentId } }),
    ]);

    if (!patient) throw new AppError("Patient not found", 404);
    if (!doctor) throw new AppError("Doctor not found", 404);
    if (!department) throw new AppError("Department not found", 404);

    // Calculate end time
    const startTime = new Date(data.scheduledAt);
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60000);

    // Check for conflicting appointments
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
        AND: [
          { scheduledAt: { lt: endTime } },
          { endTime: { gt: startTime } }
        ]
      }
    });

    if (conflict) {
      throw new AppError("Doctor is already booked for this time slot", 409);
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        departmentId: data.departmentId,
        scheduledAt: startTime,
        endTime,
        durationMinutes: data.durationMinutes,
        reasonForVisit: data.reasonForVisit,
        priority: data.priority as any,
        scheduledById: scheduledBy,
        status: "SCHEDULED"
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        doctor: { select: { user: { select: { firstName: true, lastName: true } } } },
      }
    });

    return appointment;
  }

  static async getAppointments(query: PaginationInput & { date?: string; doctorId?: string; status?: string; patientId?: string }) {
    const { page, limit, search, date, doctorId, status, patientId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {
      ...(doctorId && { doctorId }),
      ...(patientId && { patientId }),
      ...(status && { status: status as any }),
    };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      where.scheduledAt = { gte: startOfDay, lte: endOfDay };
    }

    if (search) {
      where.OR = [
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { mrn: { contains: search, mode: "insensitive" } } },
        { reasonForVisit: { contains: search, mode: "insensitive" } }
      ];
    }

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true, dob: true, gender: true } },
          doctor: { select: { user: { select: { firstName: true, lastName: true, email: true } }, designation: true } },
          department: { select: { name: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    return {
      data: appointments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async updateAppointmentStatus(id: string, data: UpdateAppointmentStatusInput) {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new AppError("Appointment not found", 404);

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: data.status as any,
        ...(data.notes && { notes: data.notes })
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        doctor: { select: { user: { select: { firstName: true, lastName: true } } } },
      }
    });

    return updated;
  }
}
