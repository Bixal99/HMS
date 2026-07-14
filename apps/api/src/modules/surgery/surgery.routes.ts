import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  boardHandler,
  cancelHandler,
  completeHandler,
  createRequestHandler,
  mineHandler,
  scheduleHandler,
} from "./surgery.controller";

const router = Router();

router.use(authenticate);

router.post("/requests", authorize("DOCTOR"), createRequestHandler);

router.get("/board", authorize("ADMIN", "DOCTOR", "RECEPTIONIST"), boardHandler);

router.get("/mine", authorize("PATIENT"), mineHandler);

router.patch(
  "/requests/:id/schedule",
  authorize("ADMIN", "DOCTOR"),
  scheduleHandler,
);

router.patch(
  "/requests/:id/complete",
  authorize("ADMIN", "DOCTOR"),
  completeHandler,
);

router.patch(
  "/requests/:id/cancel",
  authorize("ADMIN", "DOCTOR"),
  cancelHandler,
);

export default router;
