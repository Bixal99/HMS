import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import {
  loginSchema,
  registerPatientSchema,
  createStaffSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@shared/validators";
import { AppError } from "../../middleware/errorHandler";
import { ApiResponse } from "@shared/types";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerPatientSchema.parse(req.body);
      const { tokens, user } = await AuthService.registerPatient(validatedData);

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

      res.status(201).json(response);
    } catch (error: any) {
      if (error.name === "ZodError") {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

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

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("User not found", 401);
      }

      const user = await AuthService.getUserProfile(req.user.userId);

      const response: ApiResponse = {
        status: "success",
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async createStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validatedData = createStaffSchema.parse(req.body);
      const user = await AuthService.createStaff(validatedData);

      const response: ApiResponse = {
        status: "success",
        data: user,
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

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      await AuthService.forgotPassword(validatedData.email);

      const response: ApiResponse = {
        status: "success",
        message: "Password reset link sent to email",
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

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      await AuthService.resetPassword(validatedData.token, validatedData.password);

      const response: ApiResponse = {
        status: "success",
        message: "Password reset successfully",
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
