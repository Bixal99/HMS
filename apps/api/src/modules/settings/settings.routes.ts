import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  changePasswordHandler,
  createDepartmentHandler,
  listDepartmentsHandler,
  listSettingsHandler,
  listUsersHandler,
  meHandler,
  publicSettingsHandler,
  updateDepartmentHandler,
  updateMeHandler,
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
departmentsRoutes.get(
  "/",
  authorize("ADMIN", "RECEPTIONIST", "PATIENT", "DOCTOR", "NURSE"),
  listDepartmentsHandler,
);
departmentsRoutes.post("/", authorize("ADMIN"), createDepartmentHandler);
departmentsRoutes.patch("/:id", authorize("ADMIN"), updateDepartmentHandler);

export const usersRoutes = Router();
usersRoutes.use(authenticate);
usersRoutes.get("/me", meHandler);
usersRoutes.patch("/me", updateMeHandler);
usersRoutes.post("/me/password", changePasswordHandler);
usersRoutes.get("/", authorize("ADMIN"), listUsersHandler);
usersRoutes.patch("/:id/status", authorize("ADMIN"), userStatusHandler);
usersRoutes.patch("/:id/role", authorize("ADMIN"), userRoleHandler);
