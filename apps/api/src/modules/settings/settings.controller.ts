import { Request, Response, NextFunction } from "express";
import { SettingsService } from "./settings.service";
import { ApiResponse } from "@shared/types";

export class SettingsController {
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.getSettings();
      const response: ApiResponse = { status: "success", data: settings };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const updates = req.body; // Map of keys to values

      const newSettings = await SettingsService.updateSettings(updates, user.id);

      const response: ApiResponse = { 
        status: "success", 
        data: newSettings,
        message: "Settings updated successfully"
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
