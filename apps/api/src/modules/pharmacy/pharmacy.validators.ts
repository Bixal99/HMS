import { z } from "zod";

export const stageSchema = z.object({
  pharmacyStage: z.enum([
    "PENDING_REVIEW",
    "PREPARING",
    "READY_FOR_PICKUP",
    "COMPLETED",
  ]),
});

export const dispenseSchema = z.object({
  overrideBatchId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).optional(),
});

export const createPoSchema = z.object({
  supplierId: z.string().uuid(),
  status: z.enum(["DRAFT", "ORDERED"]).optional().default("ORDERED"),
  items: z
    .array(
      z.object({
        medicineId: z.string().uuid(),
        quantity: z.number().int().min(1),
        unitCostCents: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const receivePoSchema = z.object({
  items: z
    .array(
      z.object({
        purchaseOrderItemId: z.string().uuid(),
        batchNo: z.string().min(1).max(64),
        expiryDate: z.string().min(1),
      }),
    )
    .min(1),
});
