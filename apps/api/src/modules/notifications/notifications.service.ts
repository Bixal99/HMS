import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export async function listNotifications(
  userId: string,
  limit = 30,
  offset = 0,
) {
  const take = Math.min(Math.max(limit, 1), 100);
  const skip = Math.max(offset, 0);
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);
  return { items, total, limit: take, offset: skip };
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markRead(userId: string, id: string) {
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;
  if (existing.readAt) return existing;
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

export type CreateNotificationData = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Prisma.InputJsonValue;
};
