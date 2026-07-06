import prisma from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

export class BillingService {
  /**
   * Generates a draft invoice for an encounter/appointment.
   */
  static async generateInvoice(patientId: string, encounterId?: string, items: { description: string, quantity: number, unitPrice: number, sourceType: string, sourceId?: string }[] = []) {
    
    let subtotal = 0;
    const formattedItems = items.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      return {
        ...item,
        lineTotal
      };
    });

    // Assume 0% tax for now, can be configured later
    const tax = 0;
    const discount = 0;
    const total = subtotal + tax - discount;

    const invoice = await prisma.invoice.create({
      data: {
        patientId,
        encounterId,
        status: InvoiceStatus.DRAFT,
        subtotal,
        tax,
        discount,
        total,
        items: {
          create: formattedItems
        }
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        items: true
      }
    });

    return invoice;
  }

  /**
   * Fetches all invoices with basic filtering.
   */
  static async getInvoices(status?: InvoiceStatus, patientId?: string) {
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true, phone: true } }
      }
    });

    return invoices;
  }

  /**
   * Get a specific invoice by ID
   */
  static async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true, phone: true, email: true, address: true } },
        items: true,
        payments: { orderBy: { paidAt: "desc" } }
      }
    });

    if (!invoice) throw new AppError("Invoice not found", 404);
    return invoice;
  }

  /**
   * Process a payment against an invoice
   */
  static async processPayment(invoiceId: string, amountCents: number, method: PaymentMethod, recordedByUserId: string, transactionRef?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });

    if (!invoice) throw new AppError("Invoice not found", 404);
    if (invoice.status === InvoiceStatus.PAID) throw new AppError("Invoice is already fully paid", 400);

    const amountPaidSoFar = invoice.payments.reduce((acc, p) => acc + p.amount, 0);
    const newAmountPaid = amountPaidSoFar + amountCents;

    let newStatus = invoice.status;
    if (newAmountPaid >= invoice.total) {
      newStatus = InvoiceStatus.PAID;
    } else {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    // Create payment and update invoice status in a transaction
    const [payment, updatedInvoice] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId,
          amount: amountCents,
          method,
          transactionRef,
          recordedBy: recordedByUserId,
        }
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      })
    ]);

    return { payment, updatedInvoice };
  }

  /**
   * Issue an invoice (changes status from DRAFT to ISSUED)
   */
  static async issueInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new AppError("Invoice not found", 404);
    if (invoice.status !== InvoiceStatus.DRAFT) throw new AppError("Only draft invoices can be issued", 400);

    return prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ISSUED, issuedAt: new Date() }
    });
  }
}
