import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  listHandler,
  markAllReadHandler,
  markReadHandler,
  unreadCountHandler,
} from "./notifications.controller";

const router = Router();

router.use(authenticate);

router.get("/", listHandler);
router.get("/unread-count", unreadCountHandler);
router.patch("/:id/read", markReadHandler);
router.post("/read-all", markAllReadHandler);

export default router;
