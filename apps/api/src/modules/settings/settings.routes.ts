import { Router } from "express";
import { SettingsController } from "./settings.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole([Role.ADMIN]), SettingsController.getSettings);
router.put("/", requireRole([Role.ADMIN]), SettingsController.updateSettings);

export default router;
