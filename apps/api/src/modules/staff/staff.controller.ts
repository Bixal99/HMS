import { Request, Response, NextFunction } from "express";
import { StaffService } from "./staff.service";
import { createStaffSchema, paginationSchema } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";

export class StaffController {
  static async createStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createStaffSchema.parse(req.body);
      const staff = await StaffService.createStaff(validatedData);

      const response: ApiResponse = {
        status: "success",
        data: staff,
        message: "Staff member registered successfully",
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

  static async getStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const query = paginationSchema.parse(req.query);
      const { role, departmentId } = req.query;

      const { data, meta } = await StaffService.getStaff({
        ...query,
        role: role as string,
        departmentId: departmentId as string,
      });

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

  static async getStaffById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const staff = await StaffService.getStaffById(id);

      const response: ApiResponse = {
        status: "success",
        data: staff,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
