import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole([Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR]), AppointmentController.createAppointment);
router.get("/", AppointmentController.getAppointments);
router.put("/:id/status", requireRole([Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR]), AppointmentController.updateStatus);

export default router;
