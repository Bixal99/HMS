import type { Request, Response } from "express";
import {
  addDiagnosis,
  addVitals,
  createPrescription,
  finalizeEncounter,
  getEncounter,
  getPatientContext,
  listEncountersForPatient,
  listRevisions,
  requestAdmit,
  requestFollowUp,
  searchMedicines,
  startEncounter,
  updateEncounterNotes,
} from "./encounters.service";
import {
  diagnosisSchema,
  prescriptionSchema,
  requestAdmitSchema,
  requestFollowUpSchema,
  startEncounterSchema,
  updateNotesSchema,
  vitalsSchema,
} from "./encounters.validators";
import { renderVisitSummaryPdf } from "./visitSummaryPdf";
import { getSetting } from "../settings/settings.service";
import { resolvePatientId, resolveStaffId } from "../appointments/appointments.service";

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : String(id);
}

async function assertEncounterAccess(
  req: Request,
  encounter: { doctorId: string; patientId: string },
  mode: "read" | "write",
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!req.user) return { ok: false, status: 401, error: "Unauthenticated" };

  if (req.user.role === "ADMIN") {
    if (mode === "write") {
      return { ok: false, status: 403, error: "Admins have read-only access to encounters" };
    }
    return { ok: true };
  }

  if (req.user.role === "DOCTOR") {
    const staffId = await resolveStaffId(req.user.id);
    if (!staffId || staffId !== encounter.doctorId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true };
  }

  if (req.user.role === "NURSE") {
    if (mode === "write") {
      return { ok: false, status: 403, error: "Nurses cannot edit clinical notes" };
    }
    return { ok: true };
  }

  if (req.user.role === "PATIENT") {
    if (mode === "write") {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    const patientId = await resolvePatientId(req.user.id);
    if (!patientId || patientId !== encounter.patientId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function listMineHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  if (req.user.role !== "PATIENT") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patientId = await resolvePatientId(req.user.id);
  if (!patientId) return res.status(404).json({ error: "No patient profile" });
  const data = await listEncountersForPatient(patientId);
  return res.json({ data });
}

export async function startHandler(req: Request, res: Response) {
  const parsed = startEncounterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  try {
    const encounter = await startEncounter(parsed.data.appointmentId, staffId);
    return res.status(201).json(encounter);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "FORBIDDEN") return res.status(403).json({ error: "Forbidden" });
      if (err.message === "INVALID_STATUS") {
        return res.status(400).json({ error: "Appointment must be checked in to start an encounter" });
      }
    }
    throw err;
  }
}

export async function getHandler(req: Request, res: Response) {
  const encounter = await getEncounter(paramId(req));
  if (!encounter) return res.status(404).json({ error: "Not found" });

  const access = await assertEncounterAccess(req, encounter, "read");
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const context = await getPatientContext(encounter.patientId);
  return res.json({ ...encounter, context });
}

export async function patchNotesHandler(req: Request, res: Response) {
  const parsed = updateNotesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const encounter = await getEncounter(paramId(req));
  if (!encounter) return res.status(404).json({ error: "Not found" });

  const access = await assertEncounterAccess(req, encounter, "write");
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const updated = await updateEncounterNotes(encounter.id, req.user!.id, parsed.data);
  return res.json(updated);
}

export async function finalizeHandler(req: Request, res: Response) {
  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  try {
    const encounter = await finalizeEncounter(paramId(req), staffId);
    return res.json(encounter);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") return res.status(404).json({ error: "Not found" });
      if (err.message === "FORBIDDEN") return res.status(403).json({ error: "Forbidden" });
      if (err.message === "ALREADY_FINALIZED") {
        return res.status(400).json({ error: "Encounter already finalized" });
      }
    }
    throw err;
  }
}

export async function requestAdmitHandler(req: Request, res: Response) {
  const parsed = requestAdmitSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  try {
    const result = await requestAdmit(paramId(req), staffId, parsed.data.note);
    return res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    throw err;
  }
}

export async function requestFollowUpHandler(req: Request, res: Response) {
  const parsed = requestFollowUpSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  try {
    const result = await requestFollowUp(paramId(req), staffId, parsed.data);
    return res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    throw err;
  }
}

export async function vitalsHandler(req: Request, res: Response) {
  const parsed = vitalsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const encounter = await getEncounter(paramId(req));
  if (!encounter) return res.status(404).json({ error: "Not found" });

  if (!req.user || !["DOCTOR", "NURSE", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user.role === "DOCTOR") {
    const staffId = await resolveStaffId(req.user.id);
    if (!staffId || staffId !== encounter.doctorId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const vitals = await addVitals(encounter.id, req.user.id, parsed.data);
  return res.status(201).json(vitals);
}

export async function diagnosisHandler(req: Request, res: Response) {
  const parsed = diagnosisSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const encounter = await getEncounter(paramId(req));
  if (!encounter) return res.status(404).json({ error: "Not found" });

  const access = await assertEncounterAccess(req, encounter, "write");
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const diagnosis = await addDiagnosis(encounter.id, parsed.data);
  return res.status(201).json(diagnosis);
}

export async function prescriptionHandler(req: Request, res: Response) {
  const parsed = prescriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const encounter = await getEncounter(paramId(req));
  if (!encounter) return res.status(404).json({ error: "Not found" });

  const access = await assertEncounterAccess(req, encounter, "write");
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const staffId = await resolveStaffId(req.user!.id);
  if (!staffId) return res.status(403).json({ error: "No staff profile" });

  const prescription = await createPrescription({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    doctorId: staffId,
    items: parsed.data.items,
  });
  return res.status(201).json(prescription);
}

export async function revisionsHandler(req: Request, res: Response) {
  const encounter = await getEncounter(paramId(req));
  if (!encounter) return res.status(404).json({ error: "Not found" });

  if (!req.user || !["DOCTOR", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user.role === "DOCTOR") {
    const staffId = await resolveStaffId(req.user.id);
    if (!staffId || staffId !== encounter.doctorId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const data = await listRevisions(encounter.id);
  return res.json({ data });
}

export async function exportPdfHandler(req: Request, res: Response) {
  const encounter = await getEncounter(paramId(req));
  if (!encounter) return res.status(404).json({ error: "Not found" });

  const access = await assertEncounterAccess(req, encounter, "read");
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  if (req.user!.role === "PATIENT" && encounter.status !== "FINALIZED") {
    return res.status(403).json({ error: "PDF available after the visit is finalized" });
  }

  const branding = {
    hospitalName: await getSetting<string>("hospital.name"),
    brandColorHex: await getSetting<string>("hospital.brandColorHex"),
  };
  const buffer = await renderVisitSummaryPdf(
    encounter,
    encounter.patient,
    branding,
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="visit-${encounter.patient.mrn}.pdf"`,
  );
  return res.send(Buffer.from(buffer));
}

export async function medicinesSearchHandler(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const data = await searchMedicines(q);
  return res.json({ data });
}
