import { z } from "zod";

export const addInvoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).default(1),
  unitPriceCents: z.number().int().min(0),
});

export const recordPaymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "INSURANCE", "BANK_TRANSFER"]),
  amountCents: z.number().int().min(1),
  transactionRef: z.string().max(120).optional().nullable(),
});

export const voidInvoiceSchema = z.object({
  voidReason: z.string().trim().min(1, "A reason is required to void an invoice").max(1000),
});

export const createClaimSchema = z.object({
  provider: z.string().min(1).max(200),
  policyNo: z.string().min(1).max(120),
  claimedCents: z.number().int().min(1),
});

export const updateClaimSchema = z.object({
  status: z.enum(["SUBMITTED", "APPROVED", "DENIED"]),
});

export const listInvoicesQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  status: z
    .enum(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID"])
    .optional(),
});
