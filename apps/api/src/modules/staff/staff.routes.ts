import { Router } from "express";
import { StaffController } from "./staff.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole([Role.ADMIN]), StaffController.createStaff); // Only Admin can onboard staff
router.get("/", StaffController.getStaff);
router.get("/:id", StaffController.getStaffById);

export default router;
