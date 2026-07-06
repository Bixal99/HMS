import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.get("/kpis", requireRole([Role.ADMIN]), AnalyticsController.getDashboardKPIs);
router.get("/revenue", requireRole([Role.ADMIN]), AnalyticsController.getWeeklyRevenue);

export default router;
