import type { Prisma, Role } from "../generated/prisma/client";
import { prisma } from "./prisma";
import { tryGetIO } from "./socket-io-access";

export type NotificationInput = {
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown> | null;
};

async function userIdsByRole(role: Role): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

async function userIdByStaffId(staffId: string): Promise<string | null> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { userId: true },
  });
  return staff?.userId ?? null;
}

async function userIdByPatientId(patientId: string): Promise<string | null> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  });
  return patient?.userId ?? null;
}

export async function createNotificationsForUserIds(
  userIds: string[],
  input: NotificationInput,
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  const meta =
    input.meta == null
      ? undefined
      : (JSON.parse(JSON.stringify(input.meta)) as Prisma.InputJsonValue);

  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      meta,
    })),
  });

  const server = tryGetIO();
  if (server) {
    for (const userId of unique) {
      server.to(`user:${userId}`).emit("notification:new", {
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
      });
    }
  }
}

export async function notifyRole(role: Role, input: NotificationInput) {
  const ids = await userIdsByRole(role);
  await createNotificationsForUserIds(ids, input);
}

export async function notifyRoles(roles: Role[], input: NotificationInput) {
  const nested = await Promise.all(roles.map((r) => userIdsByRole(r)));
  await createNotificationsForUserIds(nested.flat(), input);
}

export async function notifyStaff(staffId: string, input: NotificationInput) {
  const userId = await userIdByStaffId(staffId);
  if (userId) await createNotificationsForUserIds([userId], input);
}

export async function notifyPatient(
  patientId: string,
  input: NotificationInput,
) {
  const userId = await userIdByPatientId(patientId);
  if (userId) await createNotificationsForUserIds([userId], input);
}

/** Fire-and-forget persistence so socket emits stay non-blocking. */
export function queueNotify(task: () => Promise<void>) {
  void task().catch((err) => {
    console.error("[notifications]", err);
  });
}
