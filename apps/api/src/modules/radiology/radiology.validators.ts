import { z } from "zod";

export const createRadiologyOrderSchema = z.object({
  encounterId: z.string().uuid(),
  modalityIds: z.array(z.string().uuid()).min(1),
});

export const updateRadiologyOrderStatusSchema = z.object({
  status: z.enum(["ORDERED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export const submitReportSchema = z.object({
  findings: z.string().max(10000).optional().nullable(),
  impression: z.string().max(5000).optional().nullable(),
  reportFileUrl: z.string().optional().nullable(),
});
