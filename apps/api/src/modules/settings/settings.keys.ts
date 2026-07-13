export const SETTING_KEYS = [
  "hospital.name",
  "hospital.address",
  "hospital.logoUrl",
  "hospital.brandColorHex",
  "hospital.contactEmail",
  "billing.consultationFeeCents",
  "billing.taxRatePercent",
  "billing.currency",
  "features.patientSelfRegistration",
  "features.appointmentWaitlist",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export const DEFAULT_SETTINGS: Record<SettingKey, unknown> = {
  "hospital.name": "MediCore",
  "hospital.address": null,
  "hospital.logoUrl": null,
  "hospital.brandColorHex": "#1a5cd6",
  "hospital.contactEmail": null,
  "billing.consultationFeeCents": 5000,
  "billing.taxRatePercent": 0,
  "billing.currency": "USD",
  "features.patientSelfRegistration": true,
  "features.appointmentWaitlist": true,
};
