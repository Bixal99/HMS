import { z } from "zod";

export const slotsQuerySchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string().min(1),
});

export const bookAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  scheduledAt: z.string().min(1),
  reasonForVisit: z.string().max(500).optional().nullable(),
  durationMinutes: z.number().int().min(5).max(120).optional(),
  intakeId: z.string().uuid().optional().nullable(),
  appointmentSource: z
    .enum(["PATIENT_PORTAL", "RECEPTION", "PHONE", "WALK_IN"])
    .optional(),
  visitType: z.enum(["NEW_PATIENT", "FOLLOW_UP", "ROUTINE"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "URGENT", "EMERGENCY"]).optional(),
});

export const rescheduleSchema = z.object({
  scheduledAt: z.string().min(1),
  doctorId: z.string().uuid().optional(),
});

export const cancelSchema = z.object({
  cancelReason: z.string().min(1).max(500),
});

export const waitlistSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  preferredDate: z.string().min(1),
});

export const walkInSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  reasonForVisit: z.string().max(500).optional().nullable(),
});

export const rejectSchema = z.object({
  reasonCode: z.enum([
    "DOCTOR_UNAVAILABLE",
    "CLINIC_CLOSED",
    "DUPLICATE_BOOKING",
    "PATIENT_REQUESTED_CANCEL",
    "OTHER",
  ]),
  reasonNote: z.string().max(500).optional().nullable(),
  offeredAlternatives: z
    .array(
      z.object({
        doctorId: z.string().uuid(),
        doctorName: z.string(),
        department: z.string(),
        scheduledAt: z.string(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
});

export const offerAlternativeSchema = z.object({
  alternatives: z
    .array(
      z.object({
        doctorId: z.string().uuid(),
        doctorName: z.string(),
        department: z.string(),
        scheduledAt: z.string(),
        reason: z.string().optional(),
      }),
    )
    .min(1)
    .max(5),
  note: z.string().max(500).optional().nullable(),
});

export const assignDoctorSchema = z.object({
  doctorId: z.string().uuid(),
  scheduledAt: z.string().optional(),
});

export const mineQuerySchema = z.object({
  filter: z.enum(["upcoming", "pending", "past", "cancelled"]).optional(),
});
