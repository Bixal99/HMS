import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { logSensitiveView } from "../../middleware/logSensitiveView";
import { requirePatientOwnerOrStaff, requirePatientWriteAccess } from "../../middleware/patientAccess";
import {
  addAllergyHandler,
  createPatientHandler,
  getPatientHandler,
  getTimelineHandler,
  listPatientsHandler,
  softDeletePatientHandler,
  updatePatientHandler,
  uploadDocumentHandler,
} from "./patients.controller";
import { patientLabResultsHandler } from "../lab/lab.controller";
import { upload } from "./patients.upload";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "BILLING_OFFICER"),
  listPatientsHandler,
);

router.post("/", authorize("ADMIN", "RECEPTIONIST"), createPatientHandler);

router.get(
  "/:id",
  requirePatientOwnerOrStaff,
  logSensitiveView("Patient"),
  getPatientHandler,
);

router.get("/:id/timeline", requirePatientOwnerOrStaff, getTimelineHandler);

router.get(
  "/:id/lab-results",
  authorize("ADMIN", "DOCTOR", "NURSE", "LAB_TECHNICIAN", "PATIENT"),
  patientLabResultsHandler,
);

router.patch("/:id", requirePatientWriteAccess, updatePatientHandler);

router.delete("/:id", authorize("ADMIN"), softDeletePatientHandler);

router.post(
  "/:id/allergies",
  authorize("ADMIN", "DOCTOR", "NURSE"),
  addAllergyHandler,
);

router.post(
  "/:id/documents",
  authorize("ADMIN", "RECEPTIONIST", "DOCTOR"),
  upload.single("file"),
  uploadDocumentHandler,
);

export default router;
