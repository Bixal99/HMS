import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  catalogHandler,
  collectHandler,
  createOrderHandler,
  orderDetailHandler,
  queueHandler,
  stageHandler,
  submitResultHandler,
  verifyHandler,
} from "./lab.controller";
import { labResultUpload } from "./lab.upload";

const router = Router();

router.use(authenticate);

router.get(
  "/catalog",
  authorize("DOCTOR", "LAB_TECHNICIAN", "ADMIN"),
  catalogHandler,
);

router.post("/orders", authorize("DOCTOR"), createOrderHandler);

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

router.patch(
  "/orders/:id/collect",
  authorize("LAB_TECHNICIAN", "ADMIN"),
  collectHandler,
);

router.post(
  "/results/:itemId",
  authorize("LAB_TECHNICIAN", "ADMIN"),
  labResultUpload.single("file"),
  submitResultHandler,
);

router.patch(
  "/results/:id/verify",
  authorize("ADMIN"),
  verifyHandler,
);

export default router;
