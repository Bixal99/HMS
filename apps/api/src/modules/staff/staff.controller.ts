import type { Request, Response, NextFunction } from "express";
import {
  countPendingLeave,
  createLeaveRequest,
  createStaff,
  findStaffByUserId,
  getAvailability,
  listDepartments,
  listLeaveRequests,
  listStaff,
  patchLeaveRequest,
  replaceAvailability,
} from "./staff.service";
import {
  createLeaveSchema,
  createStaffSchema,
  listStaffQuerySchema,
  patchLeaveSchema,
  replaceAvailabilitySchema,
} from "./staff.validators";

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : String(id);
}

export async function requireSelfOrAdminStaff(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  if (req.user.role === "ADMIN") return next();

  const staff = await findStaffByUserId(req.user.id);
  if (!staff || staff.id !== paramId(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

export async function listStaffHandler(req: Request, res: Response) {
  const parsed = listStaffQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }
  const data = await listStaff(parsed.data);
  return res.json({ data });
}

export async function createStaffHandler(req: Request, res: Response) {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  try {
    const staff = await createStaff(parsed.data);
    return res.status(201).json(staff);
  } catch {
    return res.status(400).json({ error: "Could not create staff (email or code may exist)" });
  }
}

export async function getAvailabilityHandler(req: Request, res: Response) {
  const blocks = await getAvailability(paramId(req));
  return res.json({ data: blocks });
}

export async function putAvailabilityHandler(req: Request, res: Response) {
  const parsed = replaceAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  const blocks = await replaceAvailability(paramId(req), parsed.data);
  return res.json({ data: blocks });
}

export async function createLeaveHandler(req: Request, res: Response) {
  const parsed = createLeaveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }
  const leave = await createLeaveRequest(paramId(req), parsed.data);
  return res.status(201).json(leave);
}

export async function listLeaveHandler(req: Request, res: Response) {
  const status =
    req.query.status === "PENDING" ||
    req.query.status === "APPROVED" ||
    req.query.status === "REJECTED"
      ? req.query.status
      : undefined;
  const data = await listLeaveRequests(status);
  return res.json({ data });
}

export async function patchLeaveHandler(req: Request, res: Response) {
  const parsed = patchLeaveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const leave = await patchLeaveRequest(paramId(req), parsed.data.status, req.user!.id);
  return res.json(leave);
}

export async function pendingLeaveCountHandler(_req: Request, res: Response) {
  const count = await countPendingLeave();
  return res.json({ count });
}

export async function listDepartmentsHandler(_req: Request, res: Response) {
  const data = await listDepartments();
  return res.json({ data });
}

export async function meStaffHandler(req: Request, res: Response) {
  const staff = await findStaffByUserId(req.user!.id);
  if (!staff) return res.status(404).json({ error: "No staff profile" });
  return res.json(staff);
}
