import { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "./analytics.service";
import { ApiResponse } from "@shared/types";

export class AnalyticsController {
  static async getDashboardKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const kpis = await AnalyticsService.getDashboardKPIs();
      const response: ApiResponse = { status: "success", data: kpis };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getWeeklyRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const chartData = await AnalyticsService.getWeeklyRevenue();
      const response: ApiResponse = { status: "success", data: chartData };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
