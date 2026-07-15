import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  alertsCountHandler,
  alertsHandler,
  createMedicineHandler,
  createPoHandler,
  dispenseHandler,
  listMedicinesHandler,
  listPoHandler,
  minePrescriptionsHandler,
  prescriptionDetailHandler,
  queueCountHandler,
  queueHandler,
  receivePoHandler,
  stageHandler,
  suppliersHandler,
  updateMedicineHandler,
} from "./pharmacy.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/medicines",
  authorize("PHARMACIST", "DOCTOR", "ADMIN"),
  listMedicinesHandler,
);
router.post("/medicines", authorize("ADMIN"), createMedicineHandler);
router.patch("/medicines/:id", authorize("ADMIN"), updateMedicineHandler);

router.get(
  "/prescriptions/mine",
  authorize("PATIENT"),
  minePrescriptionsHandler,
);

router.get("/queue/count", authorize("PHARMACIST", "ADMIN"), queueCountHandler);
router.get("/queue", authorize("PHARMACIST", "ADMIN"), queueHandler);
router.get(
  "/queue/:prescriptionId",
  authorize("PHARMACIST", "ADMIN"),
  prescriptionDetailHandler,
);
router.patch(
  "/queue/:prescriptionId/stage",
  authorize("PHARMACIST", "ADMIN"),
  stageHandler,
);

router.post(
  "/dispense/:prescriptionItemId",
  authorize("PHARMACIST", "ADMIN"),
  dispenseHandler,
);

router.get("/suppliers", authorize("PHARMACIST", "ADMIN"), suppliersHandler);
router.get(
  "/purchase-orders",
  authorize("PHARMACIST", "ADMIN"),
  listPoHandler,
);
router.post(
  "/purchase-orders",
  authorize("PHARMACIST", "ADMIN"),
  createPoHandler,
);
router.patch(
  "/purchase-orders/:id/receive",
  authorize("PHARMACIST", "ADMIN"),
  receivePoHandler,
);

router.get("/alerts", authorize("PHARMACIST", "ADMIN"), alertsHandler);
router.get(
  "/alerts/count",
  authorize("PHARMACIST", "ADMIN"),
  alertsCountHandler,
);

export default router;
