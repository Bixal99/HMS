import { Router } from "express";
import { AuditController } from "./audit.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole([Role.ADMIN]), AuditController.getLogs);

export default router;
