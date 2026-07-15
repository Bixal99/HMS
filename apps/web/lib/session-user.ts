import { cache } from "react";
import { cookies } from "next/headers";
import { validateSessionToken } from "@shared/auth";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  name?: string | null;
  staffId?: string | null;
  patientId?: string | null;
  departmentId?: string | null;
};

/** Deduped per RSC request — AuthenticatedShell + PortalShell both need the user. */
export const requireSessionUser = cache(async (): Promise<SessionUser> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const user = await validateSessionToken(prisma, token);
  if (!user) redirect("/login");

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

  return {
    ...user,
    staffId: staff?.id ?? null,
    patientId: patient?.id ?? null,
    departmentId: staff?.departmentId ?? null,
  };
});

export const cookieHeaderFromStore = cache(async (): Promise<string> => {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
});
