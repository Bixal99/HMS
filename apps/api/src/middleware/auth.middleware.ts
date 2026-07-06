import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AppError } from "./errorHandler";
import { Role } from "@shared/types";
import prisma from "../lib/prisma";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: Role;
    staffId?: string;
    patientId?: string;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AppError("Not authorized to access this route", 401);
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthenticatedRequest["user"];
    if (!decoded) {
      throw new AppError("Invalid token", 401);
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      throw new AppError("User account deactivated or not found", 401);
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError("Not authorized to access this route", 401));
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError("Forbidden: Insufficient permissions", 403));
      return;
    }
    next();
  };
};
