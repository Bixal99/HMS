import { z } from "zod";

export const roleSchema = z.enum([
  "ADMIN",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "PHARMACIST",
  "LAB_TECHNICIAN",
  "BILLING_OFFICER",
  "PATIENT",
]);

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

export const mrnSchema = z.string().min(1).max(32);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dob: z.coerce.date(),
  gender: genderSchema,
  phone: z.string().min(7).max(32),
});

export const patientDemographicsSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dob: z.coerce.date(),
  gender: genderSchema,
  bloodGroup: bloodGroupSchema,
});

export const patientContactSchema = z.object({
  phone: z.string().min(7).max(32),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  emergencyName: z.string().max(100).optional().or(z.literal("")),
  emergencyPhone: z.string().max(32).optional().or(z.literal("")),
  emergencyRelation: z.string().max(100).optional().or(z.literal("")),
});

export const patientInsuranceSchema = z.object({
  insuranceProvider: z.string().max(200).optional().or(z.literal("")),
  insurancePolicyNo: z.string().max(100).optional().or(z.literal("")),
});

export const createPatientFormSchema = patientDemographicsSchema
  .merge(patientContactSchema)
  .merge(patientInsuranceSchema);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatePatientFormInput = z.infer<typeof createPatientFormSchema>;
