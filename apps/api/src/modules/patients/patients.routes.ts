import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAbility } from "../../middleware/authorizeAbility";
import { logSensitiveView } from "../../middleware/logSensitiveView";
import { requirePatientOwnerOrStaff, requirePatientWriteAccess } from "../../middleware/patientAccess";
import {
  addAllergyHandler,
  createPatientHandler,
  getPatientHandler,
  getTimelineHandler,
  listPatientsHandler,
  mePatientProfileHandler,
  softDeletePatientHandler,
  updatePatientHandler,
  uploadDocumentHandler,
} from "./patients.controller";
import { patientLabResultsHandler } from "../lab/lab.controller";
import { upload } from "./patients.upload";

const router = Router();

router.use(authenticate);

router.get("/me", authorizeAbility("read", "Patient"), mePatientProfileHandler);

router.get("/", authorizeAbility("read", "Patient"), listPatientsHandler);

router.post("/", authorizeAbility("create", "Patient"), createPatientHandler);

router.get(
  "/:id",
  requirePatientOwnerOrStaff,
  logSensitiveView("Patient"),
  getPatientHandler,
);

router.get("/:id/timeline", requirePatientOwnerOrStaff, getTimelineHandler);

router.get(
  "/:id/lab-results",
  authorizeAbility("read", "LabResult"),
  patientLabResultsHandler,
);

router.patch("/:id", requirePatientWriteAccess, updatePatientHandler);

router.delete("/:id", authorizeAbility("delete", "Patient"), softDeletePatientHandler);

router.post(
  "/:id/allergies",
  authorizeAbility("create", "PatientAllergy"),
  addAllergyHandler,
);

router.post(
  "/:id/documents",
  authorizeAbility("create", "PatientDocument"),
  upload.single("file"),
  uploadDocumentHandler,
);

export default router;
