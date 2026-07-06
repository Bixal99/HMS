import { Router } from "express";
import { PharmacyController } from "./pharmacy.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.get("/medicines", PharmacyController.getMedicines);
router.post("/medicines", requireRole([Role.ADMIN, Role.PHARMACIST]), PharmacyController.createMedicine);
router.post("/batches", requireRole([Role.ADMIN, Role.PHARMACIST]), PharmacyController.addBatch);
router.post("/dispense", requireRole([Role.PHARMACIST, Role.ADMIN]), PharmacyController.dispense);
router.get("/low-stock", requireRole([Role.ADMIN, Role.PHARMACIST]), PharmacyController.getLowStock);

export default router;
