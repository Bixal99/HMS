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
