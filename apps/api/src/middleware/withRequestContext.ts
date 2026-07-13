import type { Request, Response, NextFunction } from "express";
import { requestContext } from "../lib/requestContext";

export function withRequestContext(req: Request, _res: Response, next: NextFunction) {
  const forwarded = req.headers["x-forwarded-for"];
  const ipFromForwarded =
    typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined;

  requestContext.run(
    {
      ipAddress: ipFromForwarded || req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    },
    next,
  );
}
