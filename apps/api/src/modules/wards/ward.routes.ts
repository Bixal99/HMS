import { Router } from "express";
import { WardController } from "./ward.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole([Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST]), WardController.getWards);
router.get("/admissions", requireRole([Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST]), WardController.getActiveAdmissions);

router.post("/admit", requireRole([Role.ADMIN, Role.DOCTOR, Role.NURSE]), WardController.admitPatient);
router.post("/admissions/:admissionId/discharge", requireRole([Role.ADMIN, Role.DOCTOR, Role.NURSE]), WardController.dischargePatient);

export default router;
