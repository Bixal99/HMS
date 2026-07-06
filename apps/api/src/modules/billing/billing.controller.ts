import { Request, Response, NextFunction } from "express";
import { BillingService } from "./billing.service";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";

// Validation schemas
const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().int().min(1),
    unitPrice: z.number().int().min(0), // cents
    sourceType: z.string(),
    sourceId: z.string().optional()
  }))
});

const processPaymentSchema = z.object({
  amountCents: z.number().int().min(1),
  method: z.nativeEnum(PaymentMethod),
  transactionRef: z.string().optional(),
});

export class BillingController {
  static async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createInvoiceSchema.parse(req.body);
      const invoice = await BillingService.generateInvoice(data.patientId, data.encounterId, data.items);
      
      const response: ApiResponse = {
        status: "success",
        data: invoice,
        message: "Invoice generated successfully",
      };
      res.status(201).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") next(new AppError(error.errors[0].message, 400));
      else next(error);
    }
  }

  static async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, patientId } = req.query;
      const invoices = await BillingService.getInvoices(
        status as InvoiceStatus | undefined,
        patientId as string | undefined
      );

      const response: ApiResponse = { status: "success", data: invoices };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const invoice = await BillingService.getInvoiceById(id);

      const response: ApiResponse = { status: "success", data: invoice };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = processPaymentSchema.parse(req.body);
      const user = (req as any).user;

      const result = await BillingService.processPayment(id, data.amountCents, data.method, user.id, data.transactionRef);

      const response: ApiResponse = {
        status: "success",
        data: result,
        message: "Payment processed successfully",
      };
      res.status(200).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") next(new AppError(error.errors[0].message, 400));
      else next(error);
    }
  }

  static async issueInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const invoice = await BillingService.issueInvoice(id);

      const response: ApiResponse = {
        status: "success",
        data: invoice,
        message: "Invoice issued successfully",
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
