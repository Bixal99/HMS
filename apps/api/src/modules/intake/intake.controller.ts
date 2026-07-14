import type { Request, Response } from "express";
import { resolvePatientId } from "../appointments/appointments.service";
import {
  createPatientIntake,
  createSymptomCategory,
  getPatientIntakeById,
  listSymptomCategories,
  projectIntakeForRole,
  recommendDepartment,
  updatePatientIntake,
  updateSymptomCategory,
} from "./intake.service";
import {
  createPatientIntakeSchema,
  createSymptomCategorySchema,
  updatePatientIntakeSchema,
  updateSymptomCategorySchema,
} from "./intake.validators";

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function recommendHandler(req: Request, res: Response) {
  const categoryId =
    typeof req.query.symptomCategoryId === "string"
      ? req.query.symptomCategoryId
      : null;
  if (!categoryId) {
    return res.status(400).json({ error: "symptomCategoryId is required" });
  }
  try {
    const data = await recommendDepartment(categoryId);
    return res.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({ error: "Symptom category not found" });
    }
    throw err;
  }
}

export async function listSymptomCategoriesHandler(_req: Request, res: Response) {
  const data = await listSymptomCategories();
  return res.json({ data });
}

export async function createSymptomCategoryHandler(req: Request, res: Response) {
  const parsed = createSymptomCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  try {
    const data = await createSymptomCategory(parsed.data);
    return res.status(201).json({ data });
  } catch {
    return res.status(400).json({ error: "Could not create symptom category" });
  }
}

export async function updateSymptomCategoryHandler(req: Request, res: Response) {
  const parsed = updateSymptomCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  try {
    const data = await updateSymptomCategory(paramId(req), parsed.data);
    return res.json({ data });
  } catch {
    return res.status(404).json({ error: "Symptom category not found" });
  }
}

export async function createPatientIntakeHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  const parsed = createPatientIntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const patientId = await resolvePatientId(req.user.id);
  if (!patientId) {
    return res.status(403).json({ error: "No patient profile linked to this account" });
  }

  const data = await createPatientIntake({
    patientId,
    ...parsed.data,
  });
  return res.status(201).json({ data });
}

export async function getPatientIntakeHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  const intake = await getPatientIntakeById(paramId(req));
  if (!intake) return res.status(404).json({ error: "Not found" });

  const role = req.user.role;
  if (role === "PATIENT") {
    const ownId = await resolvePatientId(req.user.id);
    if (!ownId || ownId !== intake.patientId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  } else if (
    !["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"].includes(role)
  ) {
    return res.status(403).json({ error: "Forbidden" });
  } else if (role === "DOCTOR") {
    if (
      !intake.appointment ||
      !req.user.staffId ||
      intake.appointment.doctorId !== req.user.staffId
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const data = projectIntakeForRole(
    intake as unknown as Record<string, unknown>,
    role,
  );
  return res.json({ data });
}

export async function updatePatientIntakeHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  const parsed = updatePatientIntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const existing = await getPatientIntakeById(paramId(req));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const ownId = await resolvePatientId(req.user.id);
  if (!ownId || ownId !== existing.patientId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const data = await updatePatientIntake(existing.id, parsed.data);
    return res.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message === "LOCKED") {
      return res.status(409).json({
        error: "This intake is locked after check-in and can no longer be edited",
      });
    }
    throw err;
  }
}
