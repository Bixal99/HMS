import { z } from "zod";
import { SETTING_KEYS, type SettingKey } from "./settings.keys";

export const settingKeySchema = z.enum(SETTING_KEYS);

export function parseSettingValue(key: SettingKey, value: unknown) {
  switch (key) {
    case "billing.consultationFeeCents":
      return z.number().int().min(0).max(10_000_000).parse(value);
    case "billing.taxRatePercent":
      return z.number().min(0).max(100).parse(value);
    case "billing.currency":
      return z.string().min(1).max(8).parse(value);
    case "hospital.name":
      return z.string().min(1).max(200).parse(value);
    case "hospital.address":
      return z.string().max(500).nullable().parse(value);
    case "hospital.logoUrl":
      return z.union([z.string().max(500), z.null()]).parse(value);
    case "hospital.brandColorHex":
      return z
        .string()
        .regex(/^#([0-9a-fA-F]{6})$/, "Expected #RRGGBB")
        .parse(value);
    case "hospital.contactEmail":
      return z.union([z.string().email(), z.null()]).parse(value);
    case "features.patientSelfRegistration":
    case "features.appointmentWaitlist":
      return z.boolean().parse(value);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export const updateSettingBodySchema = z.object({
  value: z.unknown(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});

export const userRoleSchema = z.object({
  role: z.enum([
    "ADMIN",
    "DOCTOR",
    "NURSE",
    "RECEPTIONIST",
    "PHARMACIST",
    "LAB_TECHNICIAN",
    "BILLING_OFFICER",
    "PATIENT",
  ]),
});
