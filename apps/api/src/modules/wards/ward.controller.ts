import { Request, Response, NextFunction } from "express";
import { WardService } from "./ward.service";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";

const admitPatientSchema = z.object({
  patientId: z.string().uuid(),
  bedId: z.string().uuid(),
  expectedDischargeAt: z.string().datetime().optional()
});

const dischargePatientSchema = z.object({
  dischargeSummary: z.string().optional()
});

export class WardController {
  static async getWards(req: Request, res: Response, next: NextFunction) {
    try {
      const wards = await WardService.getWards();
      const response: ApiResponse = { status: "success", data: wards };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getActiveAdmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const admissions = await WardService.getActiveAdmissions();
      const response: ApiResponse = { status: "success", data: admissions };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async admitPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const data = admitPatientSchema.parse(req.body);
      const user = (req as any).user;

      const admission = await WardService.admitPatient(data.patientId, data.bedId, user.id, data.expectedDischargeAt);

      const response: ApiResponse = {
        status: "success",
        data: admission,
        message: "Patient admitted successfully"
      };
      res.status(201).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") next(new AppError(error.errors[0].message, 400));
      else next(error);
    }
  }

  static async dischargePatient(req: Request, res: Response, next: NextFunction) {
    try {
      const { admissionId } = req.params;
      const data = dischargePatientSchema.parse(req.body);

      const admission = await WardService.dischargePatient(admissionId, data.dischargeSummary);

      const response: ApiResponse = {
        status: "success",
        data: admission,
        message: "Patient discharged successfully"
      };
      res.status(200).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") next(new AppError(error.errors[0].message, 400));
      else next(error);
    }
  }
}
