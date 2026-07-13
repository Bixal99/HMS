import { z } from "zod";

const dateInput = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

export const listAuditLogsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  resourceType: z.string().min(1).max(100).optional(),
  start: dateInput.optional(),
  end: dateInput.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const auditResourceParamsSchema = z.object({
  resourceType: z.string().min(1).max(100),
  resourceId: z.string().min(1).max(200),
});

export function parseAuditRange(start?: string, end?: string) {
  const startDate = start ? new Date(start) : undefined;
  const endDate = end ? new Date(end) : undefined;

  if (endDate && end && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
    endDate.setUTCHours(23, 59, 59, 999);
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error("INVALID_RANGE");
  }

  return { start: startDate, end: endDate };
}

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
