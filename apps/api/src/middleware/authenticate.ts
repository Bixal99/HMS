import type { Request, Response, NextFunction } from "express";
import { validateSessionToken } from "@shared/auth";
import { prisma } from "../lib/prisma";
import { requestContext } from "../lib/requestContext";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  name?: string | null;
  staffId?: string | null;
  patientId?: string | null;
  departmentId?: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const sessionToken =
    req.cookies?.["authjs.session-token"] ??
    req.cookies?.["__Secure-authjs.session-token"];

  if (!sessionToken) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  const user = await validateSessionToken(prisma, sessionToken);
  if (!user) {
    return res.status(401).json({ error: "Session expired" });
  }

  const [staff, patient] = await Promise.all([
    prisma.staff.findUnique({
      where: { userId: user.id },
      select: { id: true, departmentId: true },
    }),
    prisma.patient.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    }),
  ]);

  req.user = {
    ...user,
    staffId: staff?.id ?? null,
    patientId: patient?.id ?? null,
    departmentId: staff?.departmentId ?? null,
  };

  const store = requestContext.getStore();
  if (store) store.userId = req.user.id;

  return next();
}
