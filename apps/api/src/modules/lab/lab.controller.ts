import type { Request, Response } from "express";
import { resolveStaffId, resolvePatientId } from "../appointments/appointments.service";
import {
  collectLabOrder,
  countPendingLabOrders,
  createLabOrder,
  getLabOrderDetail,
  getLabQueue,
  listCatalog,
  listPatientLabResults,
  submitLabResult,
  updateLabOrderStatus,
  verifyLabResult,
} from "./lab.service";
import {
  createLabOrderSchema,
  submitResultSchema,
  updateLabOrderStatusSchema,
} from "./lab.validators";

function paramId(req: Request, key = "id"): string {
  const id = req.params[key];
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function catalogHandler(_req: Request, res: Response) {
  const data = await listCatalog();
  return res.json({ data });
}

export async function createOrderHandler(req: Request, res: Response) {
  const parsed = createLabOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  try {
    const order = await createLabOrder({
      encounterId: parsed.data.encounterId,
      testIds: parsed.data.testIds,
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
  const data = await getLabQueue();
  return res.json({ data });
}

export async function queueCountHandler(_req: Request, res: Response) {
  const count = await countPendingLabOrders();
  return res.json({ count });
}

export async function orderDetailHandler(req: Request, res: Response) {
  const order = await getLabOrderDetail(paramId(req));
  if (!order) return res.status(404).json({ error: "Not found" });
  return res.json(order);
}

export async function stageHandler(req: Request, res: Response) {
  const parsed = updateLabOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const order = await updateLabOrderStatus(paramId(req), parsed.data.status);
  return res.json(order);
}

export async function collectHandler(req: Request, res: Response) {
  const order = await collectLabOrder(paramId(req));
  return res.json(order);
}

export async function submitResultHandler(req: Request, res: Response) {
  const fileUrl = req.file
    ? `/uploads/lab-results/${paramId(req, "itemId")}/${req.file.filename}`
    : undefined;

  const body = {
    resultValueNumeric:
      req.body.resultValueNumeric != null && req.body.resultValueNumeric !== ""
        ? Number(req.body.resultValueNumeric)
        : null,
    resultValueText: req.body.resultValueText ?? null,
    resultFileUrl: fileUrl ?? req.body.resultFileUrl ?? null,
    manualCriticalFlag:
      req.body.manualCriticalFlag === true ||
      req.body.manualCriticalFlag === "true",
  };

  const parsed = submitResultSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const result = await submitLabResult(
      paramId(req, "itemId"),
      req.user!.id,
      parsed.data,
    );
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_RESULTED") {
      return res.status(400).json({ error: "Result already submitted for this item" });
    }
    throw err;
  }
}

export async function verifyHandler(req: Request, res: Response) {
  // Admin-only via route authorize — strip any client attempt to set fields
  if (req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Only Admin can verify lab results" });
  }
  const result = await verifyLabResult(paramId(req), req.user!.id);
  return res.json(result);
}

export async function patientLabResultsHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const patientId = paramId(req);
  const role = req.user.role;

  if (role === "PATIENT") {
    const ownId = await resolvePatientId(req.user.id);
    if (!ownId || ownId !== patientId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const data = await listPatientLabResults(patientId, { patientFacing: true });
    return res.json({ data });
  }

  if (!["DOCTOR", "ADMIN", "LAB_TECHNICIAN", "NURSE"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Doctors see unverified immediately; patients never get here with unverified
  const data = await listPatientLabResults(patientId, { patientFacing: false });
  return res.json({ data });
}
