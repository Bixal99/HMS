import { Request, Response, NextFunction } from "express";
import { EMRService } from "./emr.service";
import { createEncounterSchema, recordVitalsSchema } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";

export class EMRController {
  static async createEncounter(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createEncounterSchema.parse(req.body);
      
      const encounter = await EMRService.createEncounter(validatedData);

      const response: ApiResponse = {
        status: "success",
        data: encounter,
        message: "Encounter created successfully",
      };

      res.status(201).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

  static async getPatientHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = req.params;

      const history = await EMRService.getPatientHistory(patientId);

      const response: ApiResponse = {
        status: "success",
        data: history,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async recordVitals(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = recordVitalsSchema.parse(req.body);
      const user = (req as any).user;

      const vitals = await EMRService.recordVitals(validatedData, user.id);

      const response: ApiResponse = {
        status: "success",
        data: vitals,
        message: "Vitals recorded successfully",
      };

      res.status(201).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

  static async updateEncounter(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body;
      const user = (req as any).user;

      const encounter = await EMRService.updateEncounter(id, data, user.id);

      const response: ApiResponse = {
        status: "success",
        data: encounter,
        message: "Encounter updated successfully",
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getEncounterHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const history = await EMRService.getEncounterHistory(id);

      const response: ApiResponse = {
        status: "success",
        data: history,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
