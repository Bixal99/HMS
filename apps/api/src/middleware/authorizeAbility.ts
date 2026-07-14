import type { Request, Response, NextFunction } from "express";
import {
  defineAbilitiesFor,
  type Actions,
  type Subjects,
} from "@shared/auth";

/**
 * Enforce CASL ability for the authenticated user.
 * Subject is checked as a type (no instance conditions).
 */
export function authorizeAbility(action: Actions, subject: Subjects) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    const ability = defineAbilitiesFor({
      id: req.user.id,
      role: req.user.role,
      staffId: req.user.staffId,
      patientId: req.user.patientId,
      departmentId: req.user.departmentId,
    });

    if (!ability.can(action, subject)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
}
