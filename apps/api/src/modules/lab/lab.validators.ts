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
