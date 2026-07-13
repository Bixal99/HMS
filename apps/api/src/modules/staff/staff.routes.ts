import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  createLeaveHandler,
  createStaffHandler,
  getAvailabilityHandler,
  listDepartmentsHandler,
  listLeaveHandler,
  listStaffHandler,
  meStaffHandler,
  patchLeaveHandler,
  pendingLeaveCountHandler,
  putAvailabilityHandler,
  requireSelfOrAdminStaff,
} from "./staff.controller";

const router = Router();

router.use(authenticate);

router.get("/me", meStaffHandler);
router.get("/departments", authorize("ADMIN", "RECEPTIONIST"), listDepartmentsHandler);
router.get(
  "/leave-requests/pending-count",
  authorize("ADMIN"),
  pendingLeaveCountHandler,
);
router.get("/leave-requests", authorize("ADMIN"), listLeaveHandler);
router.patch("/leave-requests/:id", authorize("ADMIN"), patchLeaveHandler);

router.get("/", authorize("ADMIN", "RECEPTIONIST"), listStaffHandler);
router.post("/", authorize("ADMIN"), createStaffHandler);

router.get(
  "/:id/availability",
  authorize("ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "PHARMACIST", "LAB_TECHNICIAN"),
  async (req, res, next) => {
    if (req.user?.role === "ADMIN" || req.user?.role === "RECEPTIONIST") return next();
    return requireSelfOrAdminStaff(req, res, next);
  },
  getAvailabilityHandler,
);

router.put(
  "/:id/availability",
  authorize("ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "LAB_TECHNICIAN"),
  requireSelfOrAdminStaff,
  putAvailabilityHandler,
);

router.post(
  "/:id/leave-requests",
  authorize("ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "LAB_TECHNICIAN"),
  requireSelfOrAdminStaff,
  createLeaveHandler,
);

export default router;
