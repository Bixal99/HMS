import { z } from "zod";

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  departmentId: z.string().uuid(),
  unit: z.string().min(1).max(40),
  reorderThreshold: z.number().int().min(0).default(10),
  currentStock: z.number().int().min(0).optional().default(0),
});

export const recordTransactionSchema = z.object({
  itemId: z.string().uuid(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().int(),
  reasonCode: z.enum(["RECEIVED", "USED", "DAMAGED", "EXPIRED", "MISCOUNT", "OTHER"]),
});

export const reconcileSchema = z.object({
  counts: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        countedStock: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const listInventoryQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  all: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional(),
});

export const equipmentServiceSchema = z.object({
  status: z.enum(["OPERATIONAL", "MAINTENANCE", "RETIRED"]).optional(),
  lastServicedAt: z.coerce.date().optional().nullable(),
  nextServiceDueAt: z.coerce.date().optional().nullable(),
});

export const listEquipmentQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  all: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional(),
});
