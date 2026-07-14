import type { Request, Response } from "express";
import { generateInvoiceForPatient, NoBillableItemsError } from "./generateInvoice.service";
import {
  addManualInvoiceItem,
  countBillingAlerts,
  countPatientUnpaidInvoices,
  createInsuranceClaim,
  getInvoiceById,
  listInvoices,
  listInvoiceSummariesForPatient,
  recordPayment,
  updateInsuranceClaim,
  voidInvoice,
} from "./billing.service";
import {
  addInvoiceItemSchema,
  createClaimSchema,
  listInvoicesQuerySchema,
  recordPaymentSchema,
  updateClaimSchema,
  voidInvoiceSchema,
} from "./billing.validators";
import { renderInvoicePdf } from "./invoicePdf";
import { getSetting } from "../settings/settings.service";

function patientMayAccess(req: Request, patientId: string) {
  if (req.user?.role !== "PATIENT") return true;
  return req.user.patientId === patientId;
}

export async function generateHandler(req: Request, res: Response) {
  try {
    const patientId = String(req.params.patientId);
    const invoice = await generateInvoiceForPatient(patientId);
    return res.status(201).json({ data: invoice });
  } catch (err) {
    if (err instanceof NoBillableItemsError) {
      return res.status(422).json({ error: "No billable items" });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to generate invoice" });
  }
}

export async function billingAlertsCountHandler(_req: Request, res: Response) {
  const count = await countBillingAlerts();
  return res.json({ count });
}

export async function mineUnpaidCountHandler(req: Request, res: Response) {
  if (!req.user?.patientId) {
    return res.status(403).json({ error: "No patient profile" });
  }
  const count = await countPatientUnpaidInvoices(req.user.patientId);
  return res.json({ count });
}

export async function listHandler(req: Request, res: Response) {
  const parsed = listInvoicesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  if (req.user?.role === "PATIENT") {
    if (!req.user.patientId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const data = await listInvoices(parsed.data, {
      patientIdOnly: req.user.patientId,
      excludeDraftVoid: true,
    });
    return res.json({ data });
  }

  const data = await listInvoices(parsed.data);
  return res.json({ data });
}

export async function listMineHandler(req: Request, res: Response) {
  if (!req.user?.patientId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const data = await listInvoices(
    {},
    { patientIdOnly: req.user.patientId, excludeDraftVoid: true },
  );
  return res.json({ data });
}

export async function getHandler(req: Request, res: Response) {
  const invoice = await getInvoiceById(String(req.params.id));
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  if (!patientMayAccess(req, invoice.patientId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (
    req.user?.role === "PATIENT" &&
    (invoice.status === "DRAFT" || invoice.status === "VOID")
  ) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  return res.json({ data: invoice });
}

export async function addItemHandler(req: Request, res: Response) {
  const parsed = addInvoiceItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid item payload" });
  }

  try {
    const invoice = await addManualInvoiceItem(String(req.params.id), parsed.data);
    return res.json({ data: invoice });
  } catch (err) {
    if (err instanceof Error && err.message === "INVOICE_LOCKED") {
      return res.status(400).json({ error: "Cannot add items to a void or paid invoice" });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to add item" });
  }
}

export async function paymentHandler(req: Request, res: Response) {
  const parsed = recordPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payment payload" });
  }

  try {
    const payment = await recordPayment(
      String(req.params.id),
      parsed.data,
      req.user!.id,
    );
    return res.status(201).json({ data: payment });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INVOICE_VOID") {
        return res.status(400).json({ error: "Cannot pay a void invoice" });
      }
      if (err.message === "INVOICE_PAID") {
        return res.status(400).json({ error: "Invoice is already paid" });
      }
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to record payment" });
  }
}

export async function voidHandler(req: Request, res: Response) {
  const parsed = voidInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A reason is required to void an invoice" });
  }

  try {
    const invoice = await voidInvoice(String(req.params.id), parsed.data);
    return res.json({ data: invoice });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_VOID") {
      return res.status(400).json({ error: "Invoice is already void" });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to void invoice" });
  }
}

export async function createClaimHandler(req: Request, res: Response) {
  const parsed = createClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid claim payload" });
  }

  try {
    const claim = await createInsuranceClaim(String(req.params.id), parsed.data);
    return res.status(201).json({ data: claim });
  } catch (err) {
    if (err instanceof Error && err.message === "INVOICE_VOID") {
      return res.status(400).json({ error: "Cannot claim against a void invoice" });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to create claim" });
  }
}

export async function updateClaimHandler(req: Request, res: Response) {
  const parsed = updateClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid claim status" });
  }

  try {
    const claim = await updateInsuranceClaim(String(req.params.id), parsed.data);
    return res.json({ data: claim });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update claim" });
  }
}

export async function pdfHandler(req: Request, res: Response) {
  const invoice = await getInvoiceById(String(req.params.id));
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  if (!patientMayAccess(req, invoice.patientId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (
    req.user?.role === "PATIENT" &&
    (invoice.status === "DRAFT" || invoice.status === "VOID")
  ) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  try {
    const branding = {
      hospitalName: await getSetting<string>("hospital.name"),
      brandColorHex: await getSetting<string>("hospital.brandColorHex"),
      logoUrl: await getSetting<string | null>("hospital.logoUrl"),
    };
    const buffer = await renderInvoicePdf(invoice, branding);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${invoice.id.slice(0, 8)}.pdf"`,
    );
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
}

/** Used by patient timeline helper — keep export for service wiring. */
export async function timelineInvoices(patientId: string) {
  return listInvoiceSummariesForPatient(patientId);
}
