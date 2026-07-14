import { z } from "zod";

export const startEncounterSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const updateNotesSchema = z.object({
  subjective: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
  chiefComplaint: z.string().optional().nullable(),
});

export const vitalsSchema = z.object({
  bpSystolic: z.number().int().min(40).max(300).optional().nullable(),
  bpDiastolic: z.number().int().min(20).max(200).optional().nullable(),
  temperatureC: z.number().min(30).max(45).optional().nullable(),
  pulseBpm: z.number().int().min(20).max(300).optional().nullable(),
  weightKg: z.number().min(1).max(500).optional().nullable(),
  heightCm: z.number().min(30).max(300).optional().nullable(),
});

export const diagnosisSchema = z.object({
  icdCode: z.string().max(32).optional().nullable(),
  description: z.string().min(1).max(500),
});

export const prescriptionItemSchema = z.object({
  medicineId: z.string().uuid(),
  dosage: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  durationDays: z.number().int().min(1).max(365),
  quantityPrescribed: z.number().int().min(1).max(10_000),
  notes: z.string().max(500).optional().nullable(),
});

export const prescriptionSchema = z.object({
  items: z.array(prescriptionItemSchema).min(1),
});

export const requestAdmitSchema = z.object({
  note: z.string().max(1000).optional().nullable(),
});

export const requestFollowUpSchema = z.object({
  preferredDate: z.string().max(100).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});
