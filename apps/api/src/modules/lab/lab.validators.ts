import { z } from "zod";

export const createLabOrderSchema = z.object({
  encounterId: z.string().uuid(),
  testIds: z.array(z.string().uuid()).min(1),
});

export const updateLabOrderStatusSchema = z.object({
  status: z.enum(["ORDERED", "COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export const submitResultSchema = z.object({
  resultValueNumeric: z.number().optional().nullable(),
  resultValueText: z.string().max(5000).optional().nullable(),
  resultFileUrl: z.string().optional().nullable(),
  manualCriticalFlag: z.boolean().optional(),
});

/** Plain object — Zod v4 forbids `.partial()` on schemas that already have refinements. */
const labCatalogObjectSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(120),
  priceCents: z.number().int().min(0),
  sampleType: z.string().min(1).max(80),
  turnaroundHours: z.number().int().positive(),
  resultType: z.enum(["NUMERIC", "TEXT", "FILE"]),
  unit: z.string().max(40).optional().nullable(),
  referenceLow: z.number().optional().nullable(),
  referenceHigh: z.number().optional().nullable(),
  criticalLow: z.number().optional().nullable(),
  criticalHigh: z.number().optional().nullable(),
});

function requireUnitForNumeric(
  data: { resultType?: "NUMERIC" | "TEXT" | "FILE"; unit?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.resultType === "NUMERIC" && !data.unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Unit is required for NUMERIC tests",
      path: ["unit"],
    });
  }
}

export const createLabCatalogSchema = labCatalogObjectSchema.superRefine(
  requireUnitForNumeric,
);

export const updateLabCatalogSchema = labCatalogObjectSchema
  .partial()
  .superRefine(requireUnitForNumeric);
