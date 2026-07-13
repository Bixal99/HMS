import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { logSensitiveView } from "../../middleware/logSensitiveView";
import {
  addItemHandler,
  createClaimHandler,
  generateHandler,
  getHandler,
  listHandler,
  listMineHandler,
  paymentHandler,
  pdfHandler,
  updateClaimHandler,
  voidHandler,
} from "./billing.controller";

const router = Router();

router.use(authenticate);

router.get("/invoices/mine", authorize("PATIENT"), listMineHandler);

router.post(
  "/invoices/generate/:patientId",
  authorize("BILLING_OFFICER", "ADMIN"),
  generateHandler,
);

router.get(
  "/invoices",
  authorize("BILLING_OFFICER", "ADMIN", "RECEPTIONIST", "PATIENT"),
  listHandler,
);

router.get(
  "/invoices/:id",
  authorize("BILLING_OFFICER", "ADMIN", "RECEPTIONIST", "PATIENT"),
  getHandler,
);

router.get(
  "/invoices/:id/pdf",
  authorize("BILLING_OFFICER", "ADMIN", "PATIENT"),
  logSensitiveView("Invoice"),
  pdfHandler,
);

router.post(
  "/invoices/:id/items",
  authorize("BILLING_OFFICER", "ADMIN"),
  addItemHandler,
);

router.post(
  "/invoices/:id/payments",
  authorize("BILLING_OFFICER", "ADMIN", "RECEPTIONIST"),
  paymentHandler,
);

router.patch(
  "/invoices/:id/void",
  authorize("BILLING_OFFICER", "ADMIN"),
  voidHandler,
);

router.post(
  "/invoices/:id/claims",
  authorize("BILLING_OFFICER", "ADMIN"),
  createClaimHandler,
);

router.patch(
  "/claims/:id",
  authorize("BILLING_OFFICER", "ADMIN"),
  updateClaimHandler,
);

export default router;
