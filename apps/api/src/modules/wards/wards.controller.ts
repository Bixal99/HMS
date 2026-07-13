import type { Request, Response } from "express";
import { parseISO } from "date-fns";
import { resolveStaffId } from "../appointments/appointments.service";
import {
  BedUnavailableError,
  admitPatient,
  dischargePatient,
  getAdmission,
  getDischargeChecklist,
  getOccupancy,
  getWardBeds,
  transferBed,
  updateBedStatus,
} from "./admissions.service";
import {
  admitSchema,
  bedStatusSchema,
  dischargeSchema,
  transferSchema,
} from "./wards.validators";

function paramId(req: Request, key = "id"): string {
  const id = req.params[key];
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function occupancyHandler(_req: Request, res: Response) {
  const data = await getOccupancy();
  return res.json({ data });
}

export async function wardBedsHandler(req: Request, res: Response) {
  const data = await getWardBeds(paramId(req));
  return res.json({ data });
}

export async function admitHandler(req: Request, res: Response) {
  const parsed = admitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  try {
    const admission = await admitPatient(
      parsed.data.patientId,
      parsed.data.bedId,
      staffId,
      parsed.data.expectedDischargeAt
        ? parseISO(parsed.data.expectedDischargeAt)
        : null,
    );
    return res.status(201).json(admission);
  } catch (err) {
    if (err instanceof BedUnavailableError) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
}

export async function checklistHandler(req: Request, res: Response) {
  const data = await getDischargeChecklist(paramId(req));
  return res.json(data);
}

export async function dischargeHandler(req: Request, res: Response) {
  const parsed = dischargeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const admission = await dischargePatient(paramId(req), parsed.data.dischargeSummary, {
      medicationReconciled: parsed.data.medicationReconciled,
      overrideReason: parsed.data.overrideReason,
    });
    return res.json(admission);
  } catch (err) {
    if (!(err instanceof Error)) throw err;
    if (err.message === "MEDS_NOT_ACKED") {
      return res.status(400).json({ error: "Medication reconciliation must be confirmed" });
    }
    if (err.message === "LABS_BLOCKING") {
      return res.status(400).json({
        error: "Pending lab results — provide overrideReason to discharge anyway",
      });
    }
    if (err.message === "ALREADY_DISCHARGED") {
      return res.status(400).json({ error: "Admission already discharged" });
    }
    throw err;
  }
}

export async function transferHandler(req: Request, res: Response) {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const admission = await transferBed(
      paramId(req),
      parsed.data.toBedId,
      parsed.data.reason,
    );
    return res.json(admission);
  } catch (err) {
    if (err instanceof BedUnavailableError) {
      return res.status(409).json({ error: err.message });
    }
    if (err instanceof Error && err.message === "ALREADY_DISCHARGED") {
      return res.status(400).json({ error: "Admission already discharged" });
    }
    throw err;
  }
}

export async function getAdmissionHandler(req: Request, res: Response) {
  const admission = await getAdmission(paramId(req));
  if (!admission) return res.status(404).json({ error: "Not found" });
  return res.json(admission);
}

export async function patchBedStatusHandler(req: Request, res: Response) {
  const parsed = bedStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const bed = await updateBedStatus(paramId(req, "bedId"), parsed.data.status);
    return res.json(bed);
  } catch (err) {
    if (err instanceof BedUnavailableError) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
}
