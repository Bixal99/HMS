import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAbility } from "../../middleware/authorizeAbility";
import { logSensitiveView } from "../../middleware/logSensitiveView";
import {
  diagnosisHandler,
  exportPdfHandler,
  finalizeHandler,
  getHandler,
  listMineHandler,
  patchNotesHandler,
  prescriptionHandler,
  requestAdmitHandler,
  requestFollowUpHandler,
  revisionsHandler,
  startHandler,
  vitalsHandler,
} from "./encounters.controller";

const router = Router();

router.use(authenticate);

router.get("/mine", authorizeAbility("read", "Encounter"), listMineHandler);

router.post("/", authorizeAbility("create", "Encounter"), startHandler);

router.get(
  "/:id",
  authorizeAbility("read", "Encounter"),
  logSensitiveView("Encounter"),
  getHandler,
);

router.patch("/:id", authorizeAbility("update", "Encounter"), patchNotesHandler);
router.patch(
  "/:id/finalize",
  authorizeAbility("update", "Encounter"),
  finalizeHandler,
);

router.post(
  "/:id/request-admit",
  authorizeAbility("create", "Admission"),
  requestAdmitHandler,
);
router.post(
  "/:id/request-follow-up",
  authorizeAbility("create", "Appointment"),
  requestFollowUpHandler,
);

router.post("/:id/vitals", authorizeAbility("create", "Vitals"), vitalsHandler);
router.post(
  "/:id/diagnoses",
  authorizeAbility("create", "Diagnosis"),
  diagnosisHandler,
);
router.post(
  "/:id/prescriptions",
  authorizeAbility("create", "Prescription"),
  prescriptionHandler,
);

router.get(
  "/:id/revisions",
  authorizeAbility("read", "Encounter"),
  revisionsHandler,
);
router.get(
  "/:id/export",
  authorizeAbility("read", "Encounter"),
  exportPdfHandler,
);

export default router;
