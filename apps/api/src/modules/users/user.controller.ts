import { Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { ApiResponse } from "@shared/types";

export class UserController {
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        throw new AppError("Unauthorized", 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          staff: true,
          patient: true,
        },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      const response: ApiResponse = {
        status: "success",
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
