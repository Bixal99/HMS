"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { loginSchema } from "@shared/validators";
import { prisma } from "@/lib/prisma";
import {
  clearLoginAttempts,
  isLoginRateLimited,
  recordFailedLogin,
} from "@/lib/login-rate-limit";
import { createDatabaseSession, setSessionCookie, SESSION_MAX_AGE_MS, SESSION_SHORT_AGE_MS } from "@/lib/session";
import { homeForRole } from "@/lib/role-routes";

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") || "unknown";
}

export type LoginResult =
  | { ok: true; role: string; redirectTo: string }
  | { ok: false; error: string };

function isDbConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "ECONNREFUSED" || e.code === "P1001" || e.code === "P1000") {
    return true;
  }
  const msg = e.message ?? "";
  return /ECONNREFUSED|Can't reach database|P1001/i.test(msg);
}

export async function loginAction(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid email or password." };
  }

  const { email, password } = parsed.data;
  const ip = await clientIp();

  if (isLoginRateLimited(ip, email)) {
    return {
      ok: false,
      error: "Too many failed attempts. Try again in 15 minutes.",
    };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      recordFailedLogin(ip, email);
      return { ok: false, error: "Invalid email or password." };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      recordFailedLogin(ip, email);
      return { ok: false, error: "Invalid email or password." };
    }

    clearLoginAttempts(ip, email);

    const rememberMe = Boolean(parsed.data.rememberMe);
    const maxAgeMs = rememberMe ? SESSION_MAX_AGE_MS : SESSION_SHORT_AGE_MS;
    const sessionToken = await createDatabaseSession(user.id, maxAgeMs);
    await setSessionCookie(sessionToken, { rememberMe, maxAgeMs });

    return {
      ok: true,
      role: user.role,
      redirectTo: homeForRole(user.role),
    };
  } catch (err) {
    if (isDbConnectionError(err)) {
      return {
        ok: false,
        error: "Unable to reach the database. Please try again shortly.",
      };
    }
    return { ok: false, error: "Sign in failed. Please try again." };
  }
}
