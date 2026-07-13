import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

const READ_STAFF = ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "BILLING_OFFICER"];
const WRITE_STAFF = ["ADMIN", "RECEPTIONIST"];

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function requirePatientOwnerOrStaff(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  if (READ_STAFF.includes(req.user.role)) {
    return next();
  }

  const patient = await prisma.patient.findFirst({
    where: { id: paramId(req), deletedAt: null },
  });

  if (!patient) {
    return res.status(404).json({ error: "Not found" });
  }

  if (patient.userId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return next();
}

export async function requirePatientWriteAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  if (WRITE_STAFF.includes(req.user.role)) {
    return next();
  }

  if (req.user.role !== "PATIENT") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const patient = await prisma.patient.findFirst({
    where: { id: paramId(req), deletedAt: null },
  });

  if (!patient) {
    return res.status(404).json({ error: "Not found" });
  }

  if (patient.userId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return next();
}
