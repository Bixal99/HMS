import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  alertsCountHandler,
  alertsHandler,
  createItemHandler,
  listEquipmentHandler,
  listInventoryHandler,
  reconcileHandler,
  serviceEquipmentHandler,
  transactionHandler,
} from "./inventory.controller";

export const inventoryRoutes = Router();
inventoryRoutes.use(authenticate);

inventoryRoutes.get(
  "/",
  authorize("ADMIN", "NURSE", "LAB_TECHNICIAN"),
  listInventoryHandler,
);

inventoryRoutes.post("/items", authorize("ADMIN"), createItemHandler);

inventoryRoutes.post(
  "/transactions",
  authorize("ADMIN", "NURSE"),
  transactionHandler,
);

inventoryRoutes.post("/reconcile", authorize("ADMIN"), reconcileHandler);

inventoryRoutes.get(
  "/alerts",
  authorize("ADMIN", "NURSE", "LAB_TECHNICIAN"),
  alertsHandler,
);

inventoryRoutes.get(
  "/alerts/count",
  authorize("ADMIN", "NURSE", "LAB_TECHNICIAN"),
  alertsCountHandler,
);

export const equipmentRoutes = Router();
equipmentRoutes.use(authenticate);

equipmentRoutes.get(
  "/",
  authorize("ADMIN", "NURSE", "LAB_TECHNICIAN"),
  listEquipmentHandler,
);

equipmentRoutes.patch(
  "/:id/service",
  authorize("ADMIN", "LAB_TECHNICIAN"),
  serviceEquipmentHandler,
);
