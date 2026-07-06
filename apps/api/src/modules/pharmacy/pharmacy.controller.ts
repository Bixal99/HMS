import { Request, Response, NextFunction } from "express";
import { PharmacyService } from "./pharmacy.service";
import { paginationSchema } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";

export class PharmacyController {
  static async getMedicines(req: Request, res: Response, next: NextFunction) {
    try {
      const query = paginationSchema.parse(req.query);
      const { data, meta } = await PharmacyService.getMedicines(query);
      res.json({ status: "success", data, meta } as ApiResponse);
    } catch (error: any) {
      next(error.name === "ZodError" ? new AppError(error.errors[0].message, 400) : error);
    }
  }

  static async createMedicine(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, genericName, form, strength, manufacturer, reorderThreshold } = req.body;
      if (!name || !genericName || !form || !strength) throw new AppError("Name, generic name, form, and strength are required", 400);
      const medicine = await PharmacyService.createMedicine({ name, genericName, form, strength, manufacturer, reorderThreshold });
      res.status(201).json({ status: "success", data: medicine, message: "Medicine added to catalog" } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  static async addBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { medicineId, batchNo, quantityInStock, unitCost, expiryDate } = req.body;
      if (!medicineId || !batchNo || !quantityInStock || !unitCost || !expiryDate) throw new AppError("All batch fields are required", 400);
      const batch = await PharmacyService.addBatch({ medicineId, batchNo, quantityInStock, unitCost, expiryDate });
      res.status(201).json({ status: "success", data: batch, message: "Batch added" } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  static async dispense(req: Request, res: Response, next: NextFunction) {
    try {
      const { prescriptionItemId } = req.body;
      if (!prescriptionItemId) throw new AppError("prescriptionItemId is required", 400);
      const user = (req as any).user;
      const dispenses = await PharmacyService.dispenseMedicine(prescriptionItemId, user.id);
      res.json({ status: "success", data: dispenses, message: "Dispensed successfully" } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await PharmacyService.getLowStockAlerts();
      res.json({ status: "success", data: alerts } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}
