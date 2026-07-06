import { Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma";
import { ApiResponse } from "@shared/types";

export class AuditController {
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100, // Limit to recent 100 for dashboard
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true, email: true }
          }
        }
      });

      const response: ApiResponse = { status: "success", data: logs };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
