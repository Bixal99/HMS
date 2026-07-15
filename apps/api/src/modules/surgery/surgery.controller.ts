import type { Request, Response } from "express";
import { resolvePatientId, resolveStaffId } from "../appointments/appointments.service";
import {
  cancelSurgeryRequest,
  completeSurgeryRequest,
  createSurgeryRequest,
  getSurgeryBoard,
  listPatientSurgeries,
  scheduleSurgeryRequest,
} from "./surgery.service";
import {
  completeSurgerySchema,
  createSurgeryRequestSchema,
  scheduleSurgerySchema,
} from "./surgery.validators";

function paramId(req: Request, key = "id"): string {
  const id = req.params[key];
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function createRequestHandler(req: Request, res: Response) {
  const parsed = createSurgeryRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  const request = await createSurgeryRequest({
    ...parsed.data,
    requestedBy: staffId,
  });
  return res.status(201).json(request);
}

export async function boardHandler(_req: Request, res: Response) {
  const data = await getSurgeryBoard();
  return res.json({ data });
}

export async function scheduleHandler(req: Request, res: Response) {
  const parsed = scheduleSurgerySchema.safeParse(req.body);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ??
      "Invalid schedule — check room, surgeon, start, and end";
    return res.status(400).json({ error: msg });
  }

  const request = await scheduleSurgeryRequest(paramId(req), parsed.data);
  return res.json(request);
}

export async function completeHandler(req: Request, res: Response) {
  const parsed = completeSurgerySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const request = await completeSurgeryRequest(
      paramId(req),
      parsed.data.operativeNotes,
    );
    return res.json(request);
  } catch (err) {
    if (!(err instanceof Error)) throw err;
    if (err.message === "CANCELLED") {
      return res.status(400).json({ error: "Cancelled requests cannot be completed" });
    }
    if (err.message === "ALREADY_COMPLETED") {
      return res.status(400).json({ error: "Surgery already completed" });
    }
    throw err;
  }
}

export async function cancelHandler(req: Request, res: Response) {
  try {
    const request = await cancelSurgeryRequest(paramId(req));
    return res.json(request);
  } catch (err) {
    if (!(err instanceof Error)) throw err;
    if (err.message === "ALREADY_COMPLETED") {
      return res.status(400).json({ error: "Completed surgeries cannot be cancelled" });
    }
    if (err.message === "ALREADY_CANCELLED") {
      return res.status(400).json({ error: "Surgery already cancelled" });
    }
    throw err;
  }
}

export async function mineHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  const patientId = await resolvePatientId(req.user.id);
  if (!patientId) {
    return res.status(403).json({ error: "No patient profile" });
  }

  const data = await listPatientSurgeries(patientId);
  return res.json({ data });
}
