import { z } from "zod";

export const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);

export const bloodGroupSchema = z.enum([
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "AB_POS",
  "AB_NEG",
  "O_POS",
  "O_NEG",
  "UNKNOWN",
]);

export const allergySeveritySchema = z.enum(["MILD", "MODERATE", "SEVERE"]);

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dob: z.coerce.date(),
  gender: genderSchema,
  phone: z.string().min(7).max(32),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  bloodGroup: bloodGroupSchema.optional().default("UNKNOWN"),
  emergencyName: z.string().max(100).optional().or(z.literal("")),
  emergencyPhone: z.string().max(32).optional().or(z.literal("")),
  emergencyRelation: z.string().max(100).optional().or(z.literal("")),
  insuranceProvider: z.string().max(200).optional().or(z.literal("")),
  insurancePolicyNo: z.string().max(100).optional().or(z.literal("")),
});

export const updatePatientSchema = createPatientSchema.partial();

export const listPatientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional().default(""),
});

export const createAllergySchema = z.object({
  allergen: z.string().min(1).max(200),
  severity: allergySeveritySchema,
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
