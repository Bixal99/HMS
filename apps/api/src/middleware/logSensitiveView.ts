import type { NextFunction, Request, Response } from "express";
import { prismaBase } from "../lib/prisma";
import { getRequestContext } from "../lib/requestContext";

export function logSensitiveView(resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (resourceType === "Patient" && req.user?.role === "PATIENT") {
      return next();
    }

    res.on("finish", () => {
      if (res.statusCode < 400) {
        const ctx = getRequestContext();
        prismaBase.auditLog
          .create({
            data: {
              userId: ctx.userId,
              action: "VIEW",
              resourceType,
              resourceId: String(req.params.id),
              ipAddress: ctx.ipAddress,
              userAgent: ctx.userAgent,
            },
          })
          .catch((err) => console.error("Audit log write failed:", err));
      }
    });
    next();
  };
}
