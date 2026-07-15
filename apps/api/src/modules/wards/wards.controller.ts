import type { Request, Response } from "express";
import { parseISO } from "date-fns";
import { resolveStaffId } from "../appointments/appointments.service";
import {
  BedUnavailableError,
  admitPatient,
  createBed,
  createWard,
  dischargePatient,
  getAdmission,
  getDischargeChecklist,
  getOccupancy,
  getWardBeds,
  listWardStructure,
  transferBed,
  updateBed,
  updateBedStatus,
  updateWard,
} from "./admissions.service";
import {
  createNursingNote,
  getMarSuggestions,
  listActiveAdmissions,
  listMedicationAdministrations,
  listNursingNotes,
  recordMedicationAdministration,
  updateCarePlan,
} from "./nursing.service";
import {
  admitSchema,
  bedStatusSchema,
  carePlanSchema,
  createBedSchema,
  createWardSchema,
  dischargeSchema,
  medicationAdminSchema,
  nursingNoteSchema,
  transferSchema,
  updateBedSchema,
  updateWardSchema,
} from "./wards.validators";

function paramId(req: Request, key = "id"): string {
  const id = req.params[key];
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function occupancyHandler(_req: Request, res: Response) {
  const data = await getOccupancy();
  return res.json({ data });
}

export async function structureHandler(_req: Request, res: Response) {
  const data = await listWardStructure();
  return res.json({ data });
}

export async function createWardHandler(req: Request, res: Response) {
  const parsed = createWardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  const data = await createWard(parsed.data);
  return res.status(201).json({ data });
}

export async function updateWardHandler(req: Request, res: Response) {
  const parsed = updateWardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  try {
    const data = await updateWard(paramId(req), parsed.data);
    return res.json({ data });
  } catch {
    return res.status(404).json({ error: "Ward not found" });
  }
}

export async function createBedHandler(req: Request, res: Response) {
  const parsed = createBedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  try {
    const data = await createBed(parsed.data);
    return res.status(201).json({ data });
  } catch {
    return res.status(409).json({ error: "Bed number may already exist in this ward" });
  }
}

export async function updateBedHandler(req: Request, res: Response) {
  const parsed = updateBedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  try {
    const data = await updateBed(paramId(req, "bedId"), parsed.data);
    return res.json({ data });
  } catch {
    return res.status(404).json({ error: "Bed not found" });
  }
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

export async function activeAdmissionsHandler(_req: Request, res: Response) {
  const data = await listActiveAdmissions();
  return res.json({ data });
}

export async function patchCarePlanHandler(req: Request, res: Response) {
  const parsed = carePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const admission = await updateCarePlan(paramId(req), parsed.data.carePlan);
  return res.json(admission);
}

export async function listNotesHandler(req: Request, res: Response) {
  const data = await listNursingNotes(paramId(req));
  return res.json({ data });
}

export async function createNoteHandler(req: Request, res: Response) {
  const parsed = nursingNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  const note = await createNursingNote(
    paramId(req),
    staffId,
    parsed.data.body,
    parsed.data.isUrgent,
  );
  return res.status(201).json(note);
}

export async function listMedicationsHandler(req: Request, res: Response) {
  const data = await listMedicationAdministrations(paramId(req));
  return res.json({ data });
}

export async function recordMedicationHandler(req: Request, res: Response) {
  const parsed = medicationAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  const record = await recordMedicationAdministration(paramId(req), staffId, parsed.data);
  return res.status(201).json(record);
}

export async function marSuggestionsHandler(req: Request, res: Response) {
  const data = await getMarSuggestions(paramId(req));
  return res.json({ data });
}
