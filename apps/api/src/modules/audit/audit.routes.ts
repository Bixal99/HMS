import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { auditHistoryHandler, listAuditLogsHandler } from "./audit.controller";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", listAuditLogsHandler);
router.get("/:resourceType/:resourceId", auditHistoryHandler);

export default router;
