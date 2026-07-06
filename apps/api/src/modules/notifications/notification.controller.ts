import { Request, Response, NextFunction } from "express";
import { NotificationService } from "./notification.service";
import { ApiResponse } from "@shared/types";

export class NotificationController {
  static async getUserNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const notifications = await NotificationService.getUserNotifications(user.id);

      const response: ApiResponse = { status: "success", data: notifications };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      await NotificationService.markAsRead(id, user.id);

      const response: ApiResponse = { status: "success", message: "Notification marked as read" };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      await NotificationService.markAllAsRead(user.id);

      const response: ApiResponse = { status: "success", message: "All notifications marked as read" };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
