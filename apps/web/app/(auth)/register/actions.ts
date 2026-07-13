"use server";

import bcrypt from "bcryptjs";
import { registerSchema } from "@shared/validators";
import { prisma } from "@/lib/prisma";
import { createDatabaseSession, setSessionCookie } from "@/lib/session";
import { homeForRole } from "@/lib/role-routes";

export type RegisterResult =
  | { ok: true; redirectTo: string }
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

export async function registerPatientAction(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }

  const data = parsed.data;

  try {
    const flag = await prisma.hospitalSetting.findUnique({
      where: { key: "features.patientSelfRegistration" },
    });
    const enabled =
      flag == null ? true : Boolean(flag.value as unknown as boolean);
    if (!enabled) {
      return {
        ok: false,
        error: "Patient self-registration is currently disabled.",
      };
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { ok: false, error: "An account with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: "PATIENT",
          name: `${data.firstName} ${data.lastName}`,
        },
      });

      await tx.patient.create({
        data: {
          userId: created.id,
          mrn: `MRN-${Date.now()}`,
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
        },
      });

      return created;
    });

    const sessionToken = await createDatabaseSession(user.id);
    await setSessionCookie(sessionToken);

    return { ok: true, redirectTo: homeForRole(user.role) };
  } catch (err) {
    if (isDbConnectionError(err)) {
      return {
        ok: false,
        error: "Unable to reach the database. Please try again shortly.",
      };
    }
    return { ok: false, error: "Registration failed. Please try again." };
  }
}
