import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  admitHandler,
  checklistHandler,
  dischargeHandler,
  getAdmissionHandler,
  occupancyHandler,
  patchBedStatusHandler,
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

admissionsRouter.post("/", authorize("DOCTOR", "NURSE", "ADMIN"), admitHandler);

admissionsRouter.get(
  "/:id",
  authorize("DOCTOR", "NURSE", "ADMIN", "BILLING_OFFICER"),
  getAdmissionHandler,
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
