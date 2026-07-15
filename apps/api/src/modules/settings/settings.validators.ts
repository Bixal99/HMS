import { z } from "zod";
import { SETTING_KEYS, type SettingKey } from "./settings.keys";

export const settingKeySchema = z.enum(SETTING_KEYS);

const BRAND_COLOR_RE = /^#([0-9a-fA-F]{6})$/;

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, fallback: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? fallback);
  }
  return result.data;
}

export function parseSettingValue(key: SettingKey, value: unknown) {
  switch (key) {
    case "billing.consultationFeeCents":
    case "billing.defaultSurgeryFeeCents":
    case "billing.nursingDailyCents":
      return parseOrThrow(
        z.number().int().min(0).max(10_000_000),
        value,
        "Invalid fee amount",
      );
    case "billing.taxRatePercent":
      return parseOrThrow(
        z.number().min(0).max(100),
        value,
        "Invalid tax rate",
      );
    case "billing.currency":
      return parseOrThrow(z.string().min(1).max(8), value, "Invalid currency");
    case "hospital.name":
      return parseOrThrow(
        z.string().min(1).max(200),
        value,
        "Hospital name is required",
      );
    case "hospital.address":
      return parseOrThrow(
        z.string().max(500).nullable(),
        value,
        "Invalid address",
      );
    case "hospital.logoUrl":
      return parseOrThrow(
        z.union([z.string().max(500), z.null()]),
        value,
        "Invalid logo URL",
      );
    case "hospital.brandColorHex":
      return parseOrThrow(
        z.string().regex(BRAND_COLOR_RE, "Brand color must be #RRGGBB (e.g. #1a5cd6)"),
        value,
        "Brand color must be #RRGGBB (e.g. #1a5cd6)",
      );
    case "hospital.contactEmail":
      return parseOrThrow(
        z.union([z.string().email(), z.null()]),
        value,
        "Invalid contact email",
      );
    case "features.patientSelfRegistration":
    case "features.appointmentWaitlist":
      return parseOrThrow(z.boolean(), value, "Expected true or false");
    case "appointment.pendingHoldHours":
      return parseOrThrow(
        z.number().int().min(1).max(168),
        value,
        "Pending hold hours must be between 1 and 168",
      );
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

export const createSpecialtySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
});

export const updateSpecialtySchema = z.object({
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

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
