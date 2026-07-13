import type { Request, Response } from "express";
import {
  addAllergy,
  addDocument,
  createPatient,
  getPatientById,
  getPatientTimeline,
  listPatients,
  softDeletePatient,
  toPublicFileUrl,
  updatePatient,
} from "./patients.service";
import {
  createAllergySchema,
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from "./patients.validators";

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : id!;
}

export async function listPatientsHandler(req: Request, res: Response) {
  const parsed = listPatientsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const result = await listPatients({
    ...parsed.data,
    role: req.user!.role,
  });
  return res.json(result);
}

export async function createPatientHandler(req: Request, res: Response) {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const patient = await createPatient(parsed.data);
  return res.status(201).json(patient);
}

export async function getPatientHandler(req: Request, res: Response) {
  const patient = await getPatientById(paramId(req), req.user!.role);
  if (!patient) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json(patient);
}

export async function getTimelineHandler(req: Request, res: Response) {
  const timeline = await getPatientTimeline(paramId(req));
  if (!timeline) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json(timeline);
}

export async function updatePatientHandler(req: Request, res: Response) {
  const parsed = updatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const patient = await updatePatient(paramId(req), parsed.data, req.user!.role);
  if (!patient) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json(patient);
}

export async function softDeletePatientHandler(req: Request, res: Response) {
  const patient = await softDeletePatient(paramId(req));
  if (!patient) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json({ id: patient.id, deletedAt: patient.deletedAt });
}

export async function addAllergyHandler(req: Request, res: Response) {
  const parsed = createAllergySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const allergy = await addAllergy(paramId(req), {
    allergen: parsed.data.allergen,
    severity: parsed.data.severity,
    notes: parsed.data.notes || undefined,
  });
  if (!allergy) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(201).json(allergy);
}

export async function uploadDocumentHandler(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "File is required" });
  }

  const docType = String(req.body.docType || "OTHER");
  const fileUrl = toPublicFileUrl(req.file.path);

  const document = await addDocument({
    patientId: paramId(req),
    uploadedBy: req.user!.id,
    fileUrl,
    docType,
  });

  if (!document) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.status(201).json(document);
}
