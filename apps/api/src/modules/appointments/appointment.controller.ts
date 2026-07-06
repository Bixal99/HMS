import { Request, Response, NextFunction } from "express";
import { AppointmentService } from "./appointment.service";
import { createAppointmentSchema, paginationSchema, updateAppointmentStatusSchema } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";

export class AppointmentController {
  static async createAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createAppointmentSchema.parse(req.body);
      const user = (req as any).user;
      
      const appointment = await AppointmentService.createAppointment(validatedData, user.id);

      const response: ApiResponse = {
        status: "success",
        data: appointment,
        message: "Appointment booked successfully",
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

  static async getAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const query = paginationSchema.parse(req.query);
      const { date, doctorId, status, patientId } = req.query;

      const { data, meta } = await AppointmentService.getAppointments({
        ...query,
        date: date as string,
        doctorId: doctorId as string,
        status: status as string,
        patientId: patientId as string,
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

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateAppointmentStatusSchema.parse(req.body);

      const appointment = await AppointmentService.updateAppointmentStatus(id, validatedData);

      const response: ApiResponse = {
        status: "success",
        data: appointment,
        message: `Appointment status updated to ${appointment.status}`,
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
