import prisma from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { BedStatus } from "@prisma/client";

export class WardService {
  /**
   * Get all wards and their beds
   */
  static async getWards() {
    return await prisma.ward.findMany({
      include: {
        department: { select: { name: true } },
        beds: {
          orderBy: { bedNumber: "asc" },
          include: {
            admissions: {
              where: { dischargedAt: null },
              include: {
                patient: { select: { firstName: true, lastName: true, mrn: true } }
              }
            }
          }
        }
      },
      orderBy: { floor: "asc" }
    });
  }

  /**
   * Get all active admissions
   */
  static async getActiveAdmissions() {
    return await prisma.admission.findMany({
      where: { dischargedAt: null },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        bed: {
          include: {
            ward: { select: { name: true, floor: true } }
          }
        },
        admitter: {
          include: { user: { select: { firstName: true, lastName: true } } }
        }
      },
      orderBy: { admittedAt: "desc" }
    });
  }

  /**
   * Admit a patient to a bed
   */
  static async admitPatient(patientId: string, bedId: string, admittedByUserId: string, expectedDischargeAt?: string) {
    const bed = await prisma.bed.findUnique({ where: { id: bedId } });
    if (!bed) throw new AppError("Bed not found", 404);
    if (bed.status !== BedStatus.AVAILABLE) throw new AppError("Bed is not available", 400);

    const staff = await prisma.staff.findUnique({ where: { userId: admittedByUserId } });
    if (!staff) throw new AppError("Only staff can admit patients", 403);

    // Check if patient is already admitted
    const activeAdmission = await prisma.admission.findFirst({
      where: { patientId, dischargedAt: null }
    });
    if (activeAdmission) throw new AppError("Patient is already admitted to a bed", 400);

    const [admission] = await prisma.$transaction([
      prisma.admission.create({
        data: {
          patientId,
          bedId,
          admittedBy: staff.id,
          expectedDischargeAt: expectedDischargeAt ? new Date(expectedDischargeAt) : null,
        }
      }),
      prisma.bed.update({
        where: { id: bedId },
        data: { status: BedStatus.OCCUPIED }
      })
    ]);

    return admission;
  }

  /**
   * Discharge a patient
   */
  static async dischargePatient(admissionId: string, dischargeSummary?: string) {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
    if (!admission) throw new AppError("Admission record not found", 404);
    if (admission.dischargedAt) throw new AppError("Patient is already discharged", 400);

    const [updatedAdmission] = await prisma.$transaction([
      prisma.admission.update({
        where: { id: admissionId },
        data: {
          dischargedAt: new Date(),
          dischargeSummary
        }
      }),
      prisma.bed.update({
        where: { id: admission.bedId },
        data: { status: BedStatus.AVAILABLE }
      })
    ]);

    return updatedAdmission;
  }
}
