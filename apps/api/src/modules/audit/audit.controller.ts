import type { Request, Response } from "express";
import { getAuditHistory, listAuditLogs } from "./audit.service";
import {
  auditResourceParamsSchema,
  listAuditLogsQuerySchema,
  parseAuditRange,
} from "./audit.validators";

export async function listAuditLogsHandler(req: Request, res: Response) {
  const parsed = listAuditLogsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  try {
    const range = parseAuditRange(parsed.data.start, parsed.data.end);
    const result = await listAuditLogs({
      ...parsed.data,
      startDate: range.start,
      endDate: range.end,
    });
    return res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_RANGE") {
      return res.status(400).json({ error: "Invalid start/end date range" });
    }
    console.error(error);
    return res.status(500).json({ error: "Failed to list audit logs" });
  }
}

export async function auditHistoryHandler(req: Request, res: Response) {
  const parsed = auditResourceParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid resource", details: parsed.error.flatten() });
  }

  try {
    const history = await getAuditHistory(parsed.data.resourceType, parsed.data.resourceId);
    return res.json(history);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load audit history" });
  }
}
