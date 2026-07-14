import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "authjs.session-token";
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_SHORT_AGE_MS = 24 * 60 * 60 * 1000;

export async function createDatabaseSession(
  userId: string,
  maxAgeMs: number = SESSION_MAX_AGE_MS,
): Promise<string> {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + maxAgeMs);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return sessionToken;
}

export async function setSessionCookie(
  sessionToken: string,
  options?: { rememberMe?: boolean; maxAgeMs?: number },
): Promise<void> {
  const rememberMe = options?.rememberMe ?? false;
  const maxAgeMs =
    options?.maxAgeMs ??
    (rememberMe ? SESSION_MAX_AGE_MS : SESSION_SHORT_AGE_MS);
  const cookieStore = await cookies();

  if (rememberMe) {
    // Persistent cookie — survives browser close for up to 30 days
    cookieStore.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + maxAgeMs),
      maxAge: Math.floor(maxAgeMs / 1000),
    });
    return;
  }

  // Session cookie — cleared when the browser session ends
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("__Secure-authjs.session-token");
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({ where: { sessionToken } });
  }

  await clearSessionCookie();
}
