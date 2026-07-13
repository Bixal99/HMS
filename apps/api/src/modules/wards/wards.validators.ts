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
