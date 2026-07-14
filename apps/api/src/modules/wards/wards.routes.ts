import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  activeAdmissionsHandler,
  admitHandler,
  checklistHandler,
  createNoteHandler,
  dischargeHandler,
  getAdmissionHandler,
  listMedicationsHandler,
  listNotesHandler,
  marSuggestionsHandler,
  occupancyHandler,
  patchBedStatusHandler,
  patchCarePlanHandler,
  recordMedicationHandler,
  transferHandler,
  wardBedsHandler,
} from "./wards.controller";

const wardsRouter = Router();
const admissionsRouter = Router();

wardsRouter.use(authenticate);
admissionsRouter.use(authenticate);

wardsRouter.get(
  "/occupancy",
  authorize("NURSE", "DOCTOR", "ADMIN", "RECEPTIONIST"),
  occupancyHandler,
);

wardsRouter.get(
  "/:id/beds",
  authorize("NURSE", "DOCTOR", "ADMIN", "RECEPTIONIST"),
  wardBedsHandler,
);

wardsRouter.patch(
  "/beds/:bedId/status",
  authorize("NURSE", "ADMIN"),
  patchBedStatusHandler,
);

admissionsRouter.post(
  "/",
  authorize("DOCTOR", "NURSE", "ADMIN", "RECEPTIONIST"),
  admitHandler,
);

admissionsRouter.get(
  "/active",
  authorize("NURSE", "ADMIN", "DOCTOR"),
  activeAdmissionsHandler,
);

admissionsRouter.get(
  "/:id",
  authorize("DOCTOR", "NURSE", "ADMIN", "BILLING_OFFICER"),
  getAdmissionHandler,
);

admissionsRouter.patch(
  "/:id/care-plan",
  authorize("NURSE", "ADMIN"),
  patchCarePlanHandler,
);

admissionsRouter.get(
  "/:id/notes",
  authorize("NURSE", "ADMIN"),
  listNotesHandler,
);

admissionsRouter.post(
  "/:id/notes",
  authorize("NURSE", "ADMIN"),
  createNoteHandler,
);

admissionsRouter.get(
  "/:id/medications",
  authorize("NURSE", "ADMIN"),
  listMedicationsHandler,
);

admissionsRouter.post(
  "/:id/medications",
  authorize("NURSE", "ADMIN"),
  recordMedicationHandler,
);

admissionsRouter.get(
  "/:id/mar-suggestions",
  authorize("NURSE", "ADMIN"),
  marSuggestionsHandler,
);

admissionsRouter.get(
  "/:id/discharge-checklist",
  authorize("DOCTOR", "NURSE", "ADMIN"),
  checklistHandler,
);

admissionsRouter.patch(
  "/:id/discharge",
  authorize("DOCTOR", "ADMIN"),
  dischargeHandler,
);

admissionsRouter.patch(
  "/:id/transfer",
  authorize("NURSE", "ADMIN"),
  transferHandler,
);

export { wardsRouter, admissionsRouter };
