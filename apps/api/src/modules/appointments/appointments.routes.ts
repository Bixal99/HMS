import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  bookHandler,
  cancelHandler,
  checkInHandler,
  completeHandler,
  getSlotsHandler,
  listDoctorsHandler,
  mePatientHandler,
  noShowHandler,
  queueHandler,
  rescheduleHandler,
  waitlistHandler,
} from "./appointments.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/doctors",
  authorize("ADMIN", "RECEPTIONIST", "PATIENT", "DOCTOR", "NURSE"),
  listDoctorsHandler,
);

router.get(
  "/slots",
  authorize("ADMIN", "RECEPTIONIST", "PATIENT", "DOCTOR", "NURSE"),
  getSlotsHandler,
);

router.get("/me/patient", authorize("PATIENT"), mePatientHandler);

router.get(
  "/queue/:id",
  authorize("ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"),
  queueHandler,
);

router.post("/waitlist", authorize("ADMIN", "RECEPTIONIST", "PATIENT"), waitlistHandler);

router.post("/", authorize("ADMIN", "RECEPTIONIST", "PATIENT"), bookHandler);

router.patch(
  "/:id/reschedule",
  authorize("ADMIN", "RECEPTIONIST", "PATIENT"),
  rescheduleHandler,
);

router.patch(
  "/:id/cancel",
  authorize("ADMIN", "RECEPTIONIST", "PATIENT", "DOCTOR"),
  cancelHandler,
);

router.patch(
  "/:id/check-in",
  authorize("ADMIN", "NURSE", "RECEPTIONIST"),
  checkInHandler,
);

router.patch(
  "/:id/no-show",
  authorize("ADMIN", "NURSE", "RECEPTIONIST"),
  noShowHandler,
);

router.patch("/:id/complete", authorize("ADMIN", "DOCTOR"), completeHandler);

export default router;
