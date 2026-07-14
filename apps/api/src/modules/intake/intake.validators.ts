import { z } from "zod";
import { RED_FLAG_KEYS } from "./redFlagKeys";

export const createSymptomCategorySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  suggestedDepartmentId: z.string().uuid(),
});

export const updateSymptomCategorySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  suggestedDepartmentId: z.string().uuid().optional(),
});

export const createPatientIntakeSchema = z.object({
  symptomCategoryId: z.string().uuid(),
  chiefComplaintText: z.string().min(10).max(2000),
  durationValue: z.number().int().min(0).max(999),
  durationUnit: z.enum(["days", "weeks", "months"]),
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]),
  redFlagsSelected: z.array(z.enum(RED_FLAG_KEYS)).default([]),
});

export const updatePatientIntakeSchema = z.object({
  symptomCategoryId: z.string().uuid().optional(),
  chiefComplaintText: z.string().min(10).max(2000).optional(),
  durationValue: z.number().int().min(0).max(999).optional(),
  durationUnit: z.enum(["days", "weeks", "months"]).optional(),
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]).optional(),
  redFlagsSelected: z.array(z.enum(RED_FLAG_KEYS)).optional(),
});
