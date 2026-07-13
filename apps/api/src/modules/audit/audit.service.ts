import type { Prisma } from "../../generated/prisma/client";
import { prismaBase } from "../../lib/prisma";
import type { ListAuditLogsQuery } from "./audit.validators";

async function attachUsers<T extends { userId: string | null }>(logs: T[]) {
  const userIds = [...new Set(logs.flatMap((log) => (log.userId ? [log.userId] : [])))];
  const users =
    userIds.length === 0
      ? []
      : await prismaBase.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        });
  const usersById = new Map(users.map((user) => [user.id, user]));

  return logs.map((log) => ({
    ...log,
    user: log.userId ? (usersById.get(log.userId) ?? null) : null,
  }));
}

export async function listAuditLogs(
  query: ListAuditLogsQuery & { startDate?: Date; endDate?: Date },
) {
  const { page, pageSize, userId, resourceType, startDate, endDate } = query;
  const where: Prisma.AuditLogWhereInput = {
    ...(userId ? { userId } : {}),
    ...(resourceType ? { resourceType } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prismaBase.auditLog.count({ where }),
    prismaBase.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: await attachUsers(logs),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getAuditHistory(resourceType: string, resourceId: string) {
  const logs = await prismaBase.auditLog.findMany({
    where: { resourceType, resourceId },
    orderBy: { createdAt: "asc" },
  });

  return attachUsers(logs);
}
