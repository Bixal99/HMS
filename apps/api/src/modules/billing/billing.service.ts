import { prisma } from "../../lib/prisma";
import { emitPaymentRecorded } from "../../lib/socket";
import type {
  addInvoiceItemSchema,
  createClaimSchema,
  listInvoicesQuerySchema,
  recordPaymentSchema,
  updateClaimSchema,
  voidInvoiceSchema,
} from "./billing.validators";
import type { z } from "zod";

const invoiceInclude = {
  items: { orderBy: { description: "asc" as const } },
  payments: { orderBy: { paidAt: "desc" as const } },
  claims: { orderBy: { submittedAt: "desc" as const } },
  patient: {
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      insuranceProvider: true,
      insurancePolicyNo: true,
    },
  },
} as const;

export async function listInvoices(
  query: z.infer<typeof listInvoicesQuerySchema>,
  opts?: { patientIdOnly?: string; excludeDraftVoid?: boolean },
) {
  return prisma.invoice.findMany({
    where: {
      ...(opts?.patientIdOnly
        ? { patientId: opts.patientIdOnly }
        : query.patientId
          ? { patientId: query.patientId }
          : {}),
      ...(opts?.excludeDraftVoid
        ? { status: { notIn: ["DRAFT", "VOID"] } }
        : query.status
          ? { status: query.status }
          : {}),
    },
    include: {
      patient: {
        select: { id: true, mrn: true, firstName: true, lastName: true },
      },
      _count: { select: { items: true, payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude,
  });
}

export async function addManualInvoiceItem(
  invoiceId: string,
  input: z.infer<typeof addInvoiceItemSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (invoice.status === "VOID" || invoice.status === "PAID") {
      throw new Error("INVOICE_LOCKED");
    }

    const quantity = input.quantity ?? 1;
    const lineTotalCents = quantity * input.unitPriceCents;

    await tx.invoiceItem.create({
      data: {
        invoiceId,
        sourceType: "OTHER",
        sourceId: null,
        description: input.description,
        quantity,
        unitPriceCents: input.unitPriceCents,
        lineTotalCents,
      },
    });

    const items = await tx.invoiceItem.findMany({ where: { invoiceId } });
    const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
    const totalCents = subtotalCents - invoice.discountCents + invoice.taxCents;

    return tx.invoice.update({
      where: { id: invoiceId },
      data: { subtotalCents, totalCents },
      include: invoiceInclude,
    });
  });
}

export async function recordPayment(
  invoiceId: string,
  input: z.infer<typeof recordPaymentSchema>,
  recordedBy: string,
) {
  const payment = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (invoice.status === "VOID") {
      throw new Error("INVOICE_VOID");
    }
    if (invoice.status === "PAID") {
      throw new Error("INVOICE_PAID");
    }

    const created = await tx.payment.create({
      data: {
        invoiceId,
        method: input.method,
        amountCents: input.amountCents,
        transactionRef: input.transactionRef ?? null,
        recordedBy,
      },
    });

    const payments = await tx.payment.findMany({ where: { invoiceId } });
    const totalPaid = payments.reduce((s, p) => s + p.amountCents, 0);
    const newStatus =
      totalPaid >= invoice.totalCents ? "PAID" : "PARTIALLY_PAID";

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: newStatus,
        ...(invoice.status === "DRAFT" && !invoice.issuedAt
          ? { issuedAt: new Date() }
          : {}),
      },
    });

    return { payment: created, patientId: invoice.patientId };
  });

  emitPaymentRecorded({
    invoiceId,
    patientId: payment.patientId,
    amountCents: payment.payment.amountCents,
  });

  return payment.payment;
}

export async function countBillingAlerts() {
  const [unpaidInvoices, pendingDispenses, dischargedUninvoiced] =
    await Promise.all([
      prisma.invoice.count({
        where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "DRAFT"] } },
      }),
      prisma.dispense.count({ where: { invoicedAt: null } }),
      prisma.admission.count({
        where: { dischargedAt: { not: null }, invoicedAt: null },
      }),
    ]);
  return unpaidInvoices + pendingDispenses + dischargedUninvoiced;
}

export async function countPatientUnpaidInvoices(patientId: string) {
  return prisma.invoice.count({
    where: {
      patientId,
      status: { in: ["ISSUED", "PARTIALLY_PAID", "DRAFT"] },
    },
  });
}

export async function voidInvoice(
  invoiceId: string,
  input: z.infer<typeof voidInvoiceSchema>,
) {
  const reason = input.voidReason.trim();
  if (!reason) {
    throw new Error("VOID_REASON_REQUIRED");
  }

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.status === "VOID") {
    throw new Error("ALREADY_VOID");
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "VOID", voidReason: reason },
    include: invoiceInclude,
  });
}

export async function createInsuranceClaim(
  invoiceId: string,
  input: z.infer<typeof createClaimSchema>,
) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.status === "VOID") {
    throw new Error("INVOICE_VOID");
  }

  return prisma.insuranceClaim.create({
    data: {
      invoiceId,
      provider: input.provider,
      policyNo: input.policyNo,
      claimedCents: input.claimedCents,
    },
  });
}

export async function updateInsuranceClaim(
  claimId: string,
  input: z.infer<typeof updateClaimSchema>,
) {
  return prisma.insuranceClaim.update({
    where: { id: claimId },
    data: { status: input.status },
  });
}

export async function listOpenInvoicesForPatient(patientId: string) {
  return prisma.invoice.findMany({
    where: {
      patientId,
      status: { in: ["DRAFT", "ISSUED", "PARTIALLY_PAID"] },
    },
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listInvoiceSummariesForPatient(patientId: string) {
  return prisma.invoice.findMany({
    where: { patientId },
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      issuedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
