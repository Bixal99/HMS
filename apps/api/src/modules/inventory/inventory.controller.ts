import { Request, Response, NextFunction } from "express";
import { InventoryService } from "./inventory.service";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";
import { TransactionType } from "@prisma/client";

const createItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().min(0),
  unit: z.string().min(1),
  reorderLevel: z.number().int().min(0)
});

const logTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  quantity: z.number().int(), // can be negative for adjustments
  notes: z.string().optional()
});

export class InventoryController {
  static async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await InventoryService.getInventoryItems();
      const response: ApiResponse = { status: "success", data: items };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createItemSchema.parse(req.body);
      const item = await InventoryService.createInventoryItem(data);

      const response: ApiResponse = {
        status: "success",
        data: item,
        message: "Inventory item created"
      };
      res.status(201).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") next(new AppError(error.errors[0].message, 400));
      else next(error);
    }
  }

  static async logTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = logTransactionSchema.parse(req.body);
      const user = (req as any).user;

      const result = await InventoryService.logTransaction(id, data.type, data.quantity, user.id, data.notes);

      const response: ApiResponse = {
        status: "success",
        data: result,
        message: "Transaction logged successfully"
      };
      res.status(200).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") next(new AppError(error.errors[0].message, 400));
      else next(error);
    }
  }
}
