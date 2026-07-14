import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { authorizeAbility } from "../../middleware/authorizeAbility";
import {
  approveRescheduleHandler,
  assignDoctorHandler,
  bookHandler,
  cancelHandler,
  checkInHandler,
  completeHandler,
  confirmHandler,
  getOneHandler,
  getSlotsHandler,
  listDoctorsHandler,
  mePatientHandler,
  mineHandler,
  noShowHandler,
  offerAlternativeHandler,
  pendingCountsHandler,
  pendingHandler,
  queueHandler,
  rejectHandler,
  requestRescheduleHandler,
  rescheduleHandler,
  rescheduleRequestsHandler,
  startHandler,
  waitlistHandler,
  walkInHandler,
} from "./appointments.controller";

const router = Router();

router.use(authenticate);

router.get("/doctors", authorizeAbility("read", "Appointment"), listDoctorsHandler);
router.get("/slots", authorizeAbility("read", "Appointment"), getSlotsHandler);
router.get("/me/patient", authorizeAbility("read", "Appointment"), mePatientHandler);
router.get("/mine", authorizeAbility("read", "Appointment"), mineHandler);
router.get(
  "/pending",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("read", "Appointment"),
  pendingHandler,
);
router.get(
  "/pending/counts",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("read", "Appointment"),
  pendingCountsHandler,
);
router.get(
  "/reschedule-requests",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("read", "Appointment"),
  rescheduleRequestsHandler,
);
router.get("/queue/:id", authorizeAbility("read", "Appointment"), queueHandler);

router.post("/waitlist", authorizeAbility("create", "Appointment"), waitlistHandler);
router.post(
  "/walk-in",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("create", "Appointment"),
  walkInHandler,
);
router.post("/", authorizeAbility("create", "Appointment"), bookHandler);

router.get("/:id", authorizeAbility("read", "Appointment"), getOneHandler);
router.post(
  "/:id/confirm",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("update", "Appointment"),
  confirmHandler,
);
router.post(
  "/:id/reject",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("update", "Appointment"),
  rejectHandler,
);
router.post(
  "/:id/offer-alternative",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("update", "Appointment"),
  offerAlternativeHandler,
);
router.post(
  "/:id/assign-doctor",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("update", "Appointment"),
  assignDoctorHandler,
);
router.post(
  "/:id/request-reschedule",
  authorizeAbility("update", "Appointment"),
  requestRescheduleHandler,
);
router.post(
  "/:id/approve-reschedule",
  authorize("ADMIN", "RECEPTIONIST"),
  authorizeAbility("update", "Appointment"),
  approveRescheduleHandler,
);
router.patch("/:id/reschedule", authorizeAbility("update", "Appointment"), rescheduleHandler);
router.patch("/:id/cancel", authorizeAbility("update", "Appointment"), cancelHandler);
router.patch("/:id/check-in", authorizeAbility("update", "Appointment"), checkInHandler);
router.patch(
  "/:id/start",
  authorize("ADMIN", "DOCTOR"),
  authorizeAbility("update", "Appointment"),
  startHandler,
);
router.patch("/:id/no-show", authorizeAbility("update", "Appointment"), noShowHandler);
router.patch("/:id/complete", authorizeAbility("update", "Appointment"), completeHandler);

export default router;
