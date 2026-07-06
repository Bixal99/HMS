import { Router } from "express";
import { EMRController } from "./emr.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.post("/encounters", requireRole([Role.DOCTOR, Role.ADMIN]), EMRController.createEncounter);
router.patch("/encounters/:id", requireRole([Role.DOCTOR, Role.ADMIN]), EMRController.updateEncounter);
router.get("/encounters/:id/history", requireRole([Role.DOCTOR, Role.ADMIN]), EMRController.getEncounterHistory);

router.get("/patients/:patientId/history", requireRole([Role.DOCTOR, Role.NURSE, Role.ADMIN]), EMRController.getPatientHistory);
router.post("/vitals", requireRole([Role.NURSE, Role.DOCTOR, Role.ADMIN]), EMRController.recordVitals);

export default router;
