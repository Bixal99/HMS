/** Server-side allowlist — must stay in sync with apps/web/lib/redFlagSymptoms.ts */
export const RED_FLAG_KEYS = [
  "chest_pain_radiating",
  "difficulty_breathing",
  "stroke_signs",
  "severe_bleeding",
  "loss_of_consciousness",
  "severe_allergic_reaction",
] as const;

export type RedFlagKey = (typeof RED_FLAG_KEYS)[number];
