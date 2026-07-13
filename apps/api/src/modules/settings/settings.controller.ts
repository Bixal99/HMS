import type { Request, Response } from "express";
import {
  changeUserRole,
  createDepartment,
  getAllSettings,
  getPublicSettings,
  listDepartments,
  listUsers,
  setUserActive,
  updateDepartment,
  updateSetting,
} from "./settings.service";
import {
  createDepartmentSchema,
  settingKeySchema,
  updateDepartmentSchema,
  updateSettingBodySchema,
  userRoleSchema,
  userStatusSchema,
} from "./settings.validators";

export async function listSettingsHandler(_req: Request, res: Response) {
  const data = await getAllSettings();
  return res.json({ data });
}

export async function publicSettingsHandler(_req: Request, res: Response) {
  const data = await getPublicSettings();
  return res.json({ data });
}

export async function updateSettingHandler(req: Request, res: Response) {
  const keyParsed = settingKeySchema.safeParse(req.params.key);
  if (!keyParsed.success) {
    return res.status(400).json({ error: "Unknown setting key" });
  }
  const body = updateSettingBodySchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  try {
    const data = await updateSetting(
      keyParsed.data,
      body.data.value,
      req.user?.id,
    );
    return res.json({ data });
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : "Invalid setting value",
    });
  }
}

export async function listDepartmentsHandler(_req: Request, res: Response) {
  const data = await listDepartments();
  return res.json({ data });
}

export async function createDepartmentHandler(req: Request, res: Response) {
  const parsed = createDepartmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const data = await createDepartment(parsed.data);
    return res.status(201).json({ data });
  } catch {
    return res.status(409).json({ error: "Department name already exists" });
  }
}

export async function updateDepartmentHandler(req: Request, res: Response) {
  const parsed = updateDepartmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const data = await updateDepartment(String(req.params.id), parsed.data);
    return res.json({ data });
  } catch {
    return res.status(404).json({ error: "Department not found" });
  }
}

export async function listUsersHandler(_req: Request, res: Response) {
  const data = await listUsers();
  return res.json({ data });
}

export async function userStatusHandler(req: Request, res: Response) {
  const parsed = userStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const data = await setUserActive(
      String(req.params.id),
      parsed.data.isActive,
      req.user!.id,
    );
    return res.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message === "SELF_DEACTIVATE") {
      return res.status(400).json({ error: "You cannot deactivate your own account" });
    }
    return res.status(404).json({ error: "User not found" });
  }
}

export async function userRoleHandler(req: Request, res: Response) {
  const parsed = userRoleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  try {
    const data = await changeUserRole(
      String(req.params.id),
      parsed.data.role,
      req.user!.id,
    );
    return res.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message === "LAST_ADMIN") {
      return res
        .status(400)
        .json({ error: "Cannot demote the last active Admin" });
    }
    return res.status(404).json({ error: "User not found" });
  }
}
