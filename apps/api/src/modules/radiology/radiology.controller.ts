import type { Request, Response } from "express";
import { resolveStaffId, resolvePatientId } from "../appointments/appointments.service";
import {
  countPending,
  createOrder,
  getOrderDetail,
  getQueue,
  listModalities,
  listPatientReports,
  submitReport,
  updateStatus,
} from "./radiology.service";
import {
  createRadiologyOrderSchema,
  submitReportSchema,
  updateRadiologyOrderStatusSchema,
} from "./radiology.validators";

function paramId(req: Request, key = "id"): string {
  const id = req.params[key];
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function modalitiesHandler(_req: Request, res: Response) {
  const data = await listModalities();
  return res.json({ data });
}

export async function createOrderHandler(req: Request, res: Response) {
  const parsed = createRadiologyOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  try {
    const order = await createOrder({
      encounterId: parsed.data.encounterId,
      modalityIds: parsed.data.modalityIds,
      orderedBy: staffId,
    });
    return res.status(201).json(order);
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    throw err;
  }
}

export async function queueHandler(_req: Request, res: Response) {
  const data = await getQueue();
  return res.json({ data });
}

export async function queueCountHandler(_req: Request, res: Response) {
  const count = await countPending();
  return res.json({ count });
}

export async function orderDetailHandler(req: Request, res: Response) {
  const order = await getOrderDetail(paramId(req));
  if (!order) return res.status(404).json({ error: "Not found" });
  return res.json(order);
}

export async function stageHandler(req: Request, res: Response) {
  const parsed = updateRadiologyOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const order = await updateStatus(paramId(req), parsed.data.status);
  return res.json(order);
}

export async function submitReportHandler(req: Request, res: Response) {
  const fileUrl = req.file
    ? `/uploads/radiology-reports/${paramId(req, "itemId")}/${req.file.filename}`
    : undefined;

  const body = {
    findings: req.body.findings ?? null,
    impression: req.body.impression ?? null,
    reportFileUrl: fileUrl ?? req.body.reportFileUrl ?? null,
  };

  const parsed = submitReportSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const report = await submitReport(
      paramId(req, "itemId"),
      req.user!.id,
      parsed.data,
    );
    return res.status(201).json(report);
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_REPORTED") {
      return res.status(400).json({ error: "Report already submitted for this item" });
    }
    throw err;
  }
}

export async function patientReportsHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const patientId = await resolvePatientId(req.user.id);
  if (!patientId) {
    return res.status(403).json({ error: "No patient profile" });
  }

  const data = await listPatientReports(patientId);
  return res.json({ data });
}
