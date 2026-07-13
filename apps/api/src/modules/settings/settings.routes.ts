import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  createDepartmentHandler,
  listDepartmentsHandler,
  listSettingsHandler,
  listUsersHandler,
  publicSettingsHandler,
  updateDepartmentHandler,
  updateSettingHandler,
  userRoleHandler,
  userStatusHandler,
} from "./settings.controller";

export const settingsRoutes = Router();
settingsRoutes.get("/public", publicSettingsHandler);
settingsRoutes.use(authenticate);
settingsRoutes.get("/", authorize("ADMIN"), listSettingsHandler);
settingsRoutes.put("/:key", authorize("ADMIN"), updateSettingHandler);

export const departmentsRoutes = Router();
departmentsRoutes.use(authenticate);
departmentsRoutes.get("/", authorize("ADMIN", "RECEPTIONIST"), listDepartmentsHandler);
departmentsRoutes.post("/", authorize("ADMIN"), createDepartmentHandler);
departmentsRoutes.patch("/:id", authorize("ADMIN"), updateDepartmentHandler);

export const usersRoutes = Router();
usersRoutes.use(authenticate);
usersRoutes.get("/", authorize("ADMIN"), listUsersHandler);
usersRoutes.patch("/:id/status", authorize("ADMIN"), userStatusHandler);
usersRoutes.patch("/:id/role", authorize("ADMIN"), userRoleHandler);
