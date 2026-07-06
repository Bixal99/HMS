import { Router } from "express";
import { BillingController } from "./billing.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { Role } from "@shared/types";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole([Role.ADMIN, Role.BILLING_OFFICER, Role.RECEPTIONIST]), BillingController.createInvoice);
router.get("/", requireRole([Role.ADMIN, Role.BILLING_OFFICER, Role.RECEPTIONIST]), BillingController.getInvoices);
router.get("/:id", requireRole([Role.ADMIN, Role.BILLING_OFFICER, Role.RECEPTIONIST]), BillingController.getInvoiceById);
router.patch("/:id/issue", requireRole([Role.ADMIN, Role.BILLING_OFFICER]), BillingController.issueInvoice);
router.post("/:id/payments", requireRole([Role.ADMIN, Role.BILLING_OFFICER, Role.RECEPTIONIST]), BillingController.processPayment);

export default router;
