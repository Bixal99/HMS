import { Request, Response, NextFunction } from "express";
import { PatientService } from "./patient.service";
import { createPatientSchema, updatePatientSchema, paginationSchema } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";

export class PatientController {
  static async createPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createPatientSchema.parse(req.body);
      const patient = await PatientService.createPatient(validatedData);

      const response: ApiResponse = {
        status: "success",
        data: patient,
        message: "Patient registered successfully",
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

  static async getPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const query = paginationSchema.parse(req.query);
      const { data, meta } = await PatientService.getPatients(query);

      const response: ApiResponse = {
        status: "success",
        data,
        meta,
      };

      res.status(200).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

  static async getPatientById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const patient = await PatientService.getPatientById(id);

      const response: ApiResponse = {
        status: "success",
        data: patient,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updatePatient(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updatePatientSchema.parse(req.body);
      const patient = await PatientService.updatePatient(id, validatedData);

      const response: ApiResponse = {
        status: "success",
        data: patient,
        message: "Patient updated successfully",
      };

      res.status(200).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }
}
