import { z } from "zod";

export const createSurgeryRequestSchema = z.object({
  encounterId: z.string().uuid().optional().nullable(),
  patientId: z.string().uuid(),
  procedureName: z.string().min(1).max(300),
  urgency: z.enum(["ELECTIVE", "URGENT", "EMERGENCY"]).optional(),
  feeCents: z.number().int().min(0).optional().nullable(),
});

export const scheduleSurgerySchema = z.object({
  orRoom: z.string().min(1).max(50),
  scheduledStart: z.string().min(1),
  scheduledEnd: z.string().min(1),
  primarySurgeonId: z.string().uuid(),
  scheduleNotes: z.string().max(2000).optional().nullable(),
});

export const completeSurgerySchema = z.object({
  operativeNotes: z.string().min(1).max(10000),
});
