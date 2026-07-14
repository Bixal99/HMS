import { z } from "zod";

export const admitSchema = z.object({
  patientId: z.string().uuid(),
  bedId: z.string().uuid(),
  expectedDischargeAt: z.string().optional().nullable(),
});

export const dischargeSchema = z.object({
  dischargeSummary: z.string().min(1).max(5000),
  overrideReason: z.string().max(1000).optional().nullable(),
  medicationReconciled: z.boolean(),
});

export const transferSchema = z.object({
  toBedId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export const bedStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]),
});

export const carePlanSchema = z.object({
  carePlan: z.string().max(10000),
});

export const nursingNoteSchema = z.object({
  body: z.string().min(1).max(5000),
  isUrgent: z.boolean().optional(),
});

export const medicationAdminSchema = z.object({
  prescriptionItemId: z.string().uuid().optional().nullable(),
  medicineName: z.string().min(1).max(200),
  dose: z.string().min(1).max(100),
  route: z.string().min(1).max(50),
  notes: z.string().max(1000).optional().nullable(),
});
