import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { loginSchema } from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { tokens, user } = await AuthService.login(validatedData);

      // Set refresh token in HTTP-only cookie
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const response: ApiResponse = {
        status: "success",
        data: {
          accessToken: tokens.accessToken,
          user,
        },
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

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new AppError("No refresh token provided", 401);
      }

      const tokens = await AuthService.refresh(refreshToken);

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const response: ApiResponse = {
        status: "success",
        data: { accessToken: tokens.accessToken },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      res.clearCookie("refreshToken");
      
      const response: ApiResponse = { status: "success", message: "Logged out successfully" };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
