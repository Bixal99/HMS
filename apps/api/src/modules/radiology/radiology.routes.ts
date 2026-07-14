import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  createOrderHandler,
  modalitiesHandler,
  orderDetailHandler,
  patientReportsHandler,
  queueCountHandler,
  queueHandler,
  stageHandler,
  submitReportHandler,
} from "./radiology.controller";
import { radiologyReportUpload } from "./radiology.upload";

const router = Router();

router.use(authenticate);

router.get(
  "/modalities",
  authorize("DOCTOR", "LAB_TECHNICIAN", "ADMIN"),
  modalitiesHandler,
);

router.post("/orders", authorize("DOCTOR"), createOrderHandler);

router.get(
  "/orders/queue/count",
  authorize("LAB_TECHNICIAN", "ADMIN"),
  queueCountHandler,
);

router.get(
  "/orders/queue",
  authorize("LAB_TECHNICIAN", "ADMIN"),
  queueHandler,
);

router.get(
  "/orders/:id",
  authorize("LAB_TECHNICIAN", "ADMIN", "DOCTOR"),
  orderDetailHandler,
);

router.patch(
  "/orders/:id/stage",
  authorize("LAB_TECHNICIAN", "ADMIN"),
  stageHandler,
);

router.get(
  "/reports/mine",
  authorize("PATIENT"),
  patientReportsHandler,
);

router.post(
  "/reports/:itemId",
  authorize("LAB_TECHNICIAN", "ADMIN"),
  radiologyReportUpload.single("file"),
  submitReportHandler,
);

export default router;
