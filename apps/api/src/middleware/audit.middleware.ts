import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

/**
 * Middleware to log mutating actions (POST, PUT, PATCH, DELETE) to the AuditLog.
 * This should be injected AFTER authentication middleware so `req.user` is available.
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // We only want to log mutating operations
  if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
    return next();
  }

  // Hook into res.on('finish') to capture the response status code,
  // but we don't wait for the DB insert to complete to avoid slowing down requests.
  res.on('finish', () => {
    const user = (req as any).user;
    if (!user) return; // Unauthenticated request, probably login/register

    // Build the action name (e.g. "POST /api/billing/123/payments")
    const action = `${req.method} ${req.originalUrl}`;
    
    // Mask sensitive fields like passwords in the body
    let sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = "***MASKED***";

    // Asynchronously log to the database
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        entityId: req.params.id || null, // Best effort guess at entity ID from URL params
        beforeJson: {}, // Usually handled at the service level if we need strict versioning
        afterJson: sanitizedBody,
      }
    }).catch(err => {
      console.error("Failed to write to AuditLog", err);
    });
  });

  next();
};
