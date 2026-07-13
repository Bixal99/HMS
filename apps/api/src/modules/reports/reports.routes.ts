import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import {
  clinicalHandler,
  exportHandler,
  financialHandler,
  operationalHandler,
} from "./reports.controller";

const router = Router();

router.use(authenticate);

router.get("/operational", authorize("ADMIN"), operationalHandler);

router.get("/financial", authorize("BILLING_OFFICER", "ADMIN"), financialHandler);

router.get("/clinical", authorize("DOCTOR", "ADMIN"), clinicalHandler);

// Role check depends on the reportType in the body, so it is enforced inside
// exportHandler rather than via a static authorize(...) middleware.
router.post("/export", exportHandler);

export default router;
