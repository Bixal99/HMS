import prisma from "../../lib/prisma";
import { CreateEncounterInput, RecordVitalsInput } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";

export class EMRService {
  static async createEncounter(data: CreateEncounterInput) {
    const { patientId, doctorId, appointmentId, ...encounterData } = data;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    const doctor = await prisma.staff.findUnique({ where: { id: doctorId } });

    if (!patient) throw new AppError("Patient not found", 404);
    if (!doctor) throw new AppError("Doctor not found", 404);

    const encounter = await prisma.encounter.create({
      data: {
        patientId,
        doctorId,
        appointmentId,
        ...encounterData,
      },
      include: {
        doctor: { select: { user: { select: { firstName: true, lastName: true } }, designation: true } }
      }
    });

    return encounter;
  }

  static async getPatientHistory(patientId: string) {
    const encounters = await prisma.encounter.findMany({
      where: { patientId },
      include: {
        doctor: { select: { user: { select: { firstName: true, lastName: true } }, designation: true } },
        vitals: { orderBy: { recordedAt: "desc" } },
        diagnoses: true,
      },
      orderBy: { encounterDate: "desc" },
    });

    return encounters;
  }

  static async recordVitals(data: RecordVitalsInput, recordedByUserId: string) {
    const encounter = await prisma.encounter.findUnique({ where: { id: data.encounterId } });
    if (!encounter) throw new AppError("Encounter not found", 404);

    const staffRecorder = await prisma.staff.findUnique({ where: { userId: recordedByUserId } });
    if (!staffRecorder) throw new AppError("Only staff members can record vitals", 403);

    const vitals = await prisma.vitals.create({
      data: {
        encounterId: data.encounterId,
        recordedBy: staffRecorder.id,
        bpSystolic: data.bpSystolic,
        bpDiastolic: data.bpDiastolic,
        temperatureC: data.temperatureC,
        pulseBpm: data.pulseBpm,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
      }
    });

    return vitals;
  }

  static async updateEncounter(id: string, data: Partial<CreateEncounterInput>, userId: string) {
    const existing = await prisma.encounter.findUnique({ where: { id } });
    if (!existing) throw new AppError("Encounter not found", 404);

    // Save previous state to AuditLog
    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        resourceType: "Encounter",
        resourceId: id,
        beforeJson: existing as any,
      },
    });

    const encounter = await prisma.encounter.update({
      where: { id },
      data,
      include: {
        doctor: { select: { user: { select: { firstName: true, lastName: true } }, designation: true } }
      }
    });

    return encounter;
  }

  static async getEncounterHistory(id: string) {
    const logs = await prisma.auditLog.findMany({
      where: { resourceType: "Encounter", resourceId: id, action: "UPDATE" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } }
      }
    });
    return logs;
  }
}
