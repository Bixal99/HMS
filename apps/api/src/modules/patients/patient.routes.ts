import { Router } from "express";
import { PatientController } from "./patient.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

// All patient routes require authentication
router.use(requireAuth);

router.post("/", requireRole([Role.ADMIN, Role.RECEPTIONIST]), PatientController.createPatient);
router.get("/", PatientController.getPatients); // All authenticated staff can search patients
router.get("/:id", PatientController.getPatientById);
router.put("/:id", requireRole([Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR, Role.NURSE]), PatientController.updatePatient);

export default router;
