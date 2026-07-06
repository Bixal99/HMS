import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole([Role.ADMIN, Role.NURSE, Role.DOCTOR]), InventoryController.getItems);
router.post("/", requireRole([Role.ADMIN]), InventoryController.createItem);
router.post("/:id/transactions", requireRole([Role.ADMIN, Role.NURSE]), InventoryController.logTransaction);

export default router;
