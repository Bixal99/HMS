import type { Request, Response } from "express";
import { getOperationalReport } from "./operational.service";
import { getFinancialReport } from "./financial.service";
import { getClinicalReport } from "./clinical.service";
import { exportReport } from "./export.service";
import {
  dateRangeQuerySchema,
  exportBodySchema,
  parseRange,
} from "./reports.validators";

function badRange(res: Response) {
  return res.status(400).json({ error: "Invalid start/end date range" });
}

export async function operationalHandler(req: Request, res: Response) {
  const parsed = dateRangeQuerySchema.safeParse(req.query);
  if (!parsed.success) return badRange(res);
  try {
    const range = parseRange(parsed.data.start, parsed.data.end);
    const data = await getOperationalReport(range);
    return res.json(data);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_RANGE") {
      return badRange(res);
    }
    console.error(err);
    return res.status(500).json({ error: "Report failed" });
  }
}

export async function financialHandler(req: Request, res: Response) {
  const parsed = dateRangeQuerySchema.safeParse(req.query);
  if (!parsed.success) return badRange(res);
  try {
    const range = parseRange(parsed.data.start, parsed.data.end);
    const data = await getFinancialReport(range);
    return res.json(data);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_RANGE") {
      return badRange(res);
    }
    console.error(err);
    return res.status(500).json({ error: "Report failed" });
  }
}

export async function clinicalHandler(req: Request, res: Response) {
  const parsed = dateRangeQuerySchema.safeParse(req.query);
  if (!parsed.success) return badRange(res);

  const role = req.user!.role;
  let doctorId: string | null | undefined;
  if (role === "DOCTOR") {
    doctorId = req.user!.staffId ?? null;
    if (!doctorId) {
      return res.status(403).json({ error: "No staff profile linked" });
    }
  }

  try {
    const range = parseRange(parsed.data.start, parsed.data.end);
    const data = await getClinicalReport({ ...range, doctorId });
    return res.json(data);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_RANGE") {
      return badRange(res);
    }
    console.error(err);
    return res.status(500).json({ error: "Report failed" });
  }
}

export async function exportHandler(req: Request, res: Response) {
  const parsed = exportBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid export payload" });
  }

  const { reportType, format, start, end } = parsed.data;
  const role = req.user!.role;

  if (reportType === "operational" && role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (
    reportType === "financial" &&
    !["ADMIN", "BILLING_OFFICER"].includes(role)
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (reportType === "clinical" && !["ADMIN", "DOCTOR"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  let doctorId: string | null | undefined;
  if (reportType === "clinical" && role === "DOCTOR") {
    doctorId = req.user!.staffId ?? null;
    if (!doctorId) {
      return res.status(403).json({ error: "No staff profile linked" });
    }
  }

  try {
    const range = parseRange(start, end);
    const file = await exportReport({
      reportType,
      format,
      start: range.start,
      end: range.end,
      generatedBy: req.user!.id,
      doctorId,
    });
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`,
    );
    return res.send(file.buffer);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_RANGE") {
      return badRange(res);
    }
    console.error(err);
    return res.status(500).json({ error: "Export failed" });
  }
}
