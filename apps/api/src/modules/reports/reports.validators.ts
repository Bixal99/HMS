import { z } from "zod";

export const reportTypeSchema = z.enum(["operational", "financial", "clinical"]);
export const exportFormatSchema = z.enum(["csv", "pdf"]);

export type ReportType = z.infer<typeof reportTypeSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;

const dateInput = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const dateRangeQuerySchema = z.object({
  start: dateInput,
  end: dateInput,
});

export const exportBodySchema = z.object({
  reportType: reportTypeSchema,
  format: exportFormatSchema,
  start: dateInput,
  end: dateInput,
});

export function parseRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("INVALID_RANGE");
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    endDate.setUTCHours(23, 59, 59, 999);
  }
  if (startDate > endDate) throw new Error("INVALID_RANGE");
  return { start: startDate, end: endDate };
}
