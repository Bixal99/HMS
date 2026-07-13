import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { logSensitiveView } from "../../middleware/logSensitiveView";
import {
  diagnosisHandler,
  exportPdfHandler,
  finalizeHandler,
  getHandler,
  listMineHandler,
  patchNotesHandler,
  prescriptionHandler,
  revisionsHandler,
  startHandler,
  vitalsHandler,
} from "./encounters.controller";

const router = Router();

router.use(authenticate);

router.get("/mine", authorize("PATIENT"), listMineHandler);

router.post("/", authorize("DOCTOR"), startHandler);

router.get(
  "/:id",
  authorize("DOCTOR", "NURSE", "ADMIN", "PATIENT"),
  logSensitiveView("Encounter"),
  getHandler,
);

router.patch("/:id", authorize("DOCTOR"), patchNotesHandler);
router.patch("/:id/finalize", authorize("DOCTOR"), finalizeHandler);

router.post("/:id/vitals", authorize("DOCTOR", "NURSE"), vitalsHandler);
router.post("/:id/diagnoses", authorize("DOCTOR"), diagnosisHandler);
router.post("/:id/prescriptions", authorize("DOCTOR"), prescriptionHandler);

router.get("/:id/revisions", authorize("DOCTOR", "ADMIN"), revisionsHandler);
router.get(
  "/:id/export",
  authorize("DOCTOR", "PATIENT", "ADMIN"),
  exportPdfHandler,
);

export default router;
