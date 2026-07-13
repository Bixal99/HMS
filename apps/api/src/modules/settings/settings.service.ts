import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  type SettingKey,
} from "./settings.keys";
import { parseSettingValue } from "./settings.validators";

type CacheMap = Record<string, unknown> | null;
let cache: CacheMap = null;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function ensureDefaultSettings() {
  for (const key of SETTING_KEYS) {
    await prisma.hospitalSetting.upsert({
      where: { key },
      update: {},
      create: {
        key,
        value: asJson(DEFAULT_SETTINGS[key]),
      },
    });
  }
}

async function loadCache(): Promise<Record<string, unknown>> {
  if (cache) return cache;
  const rows = await prisma.hospitalSetting.findMany();
  const map: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    map[row.key] = row.value as unknown;
  }
  cache = map;
  return map;
}

export function invalidateSettingsCache() {
  cache = null;
}

export async function getAllSettings() {
  const map = await loadCache();
  return SETTING_KEYS.map((key) => ({
    key,
    value: map[key] ?? DEFAULT_SETTINGS[key],
  }));
}

export async function getSetting<T = unknown>(key: SettingKey): Promise<T> {
  const map = await loadCache();
  if (key in map) return map[key] as T;
  return DEFAULT_SETTINGS[key] as T;
}

export async function getPublicSettings() {
  return {
    "hospital.name": await getSetting<string>("hospital.name"),
    "features.patientSelfRegistration": await getSetting<boolean>(
      "features.patientSelfRegistration",
    ),
    "features.appointmentWaitlist": await getSetting<boolean>(
      "features.appointmentWaitlist",
    ),
  };
}

export async function updateSetting(
  key: SettingKey,
  rawValue: unknown,
  updatedBy?: string | null,
) {
  const value = parseSettingValue(key, rawValue);
  const row = await prisma.hospitalSetting.upsert({
    where: { key },
    update: { value: asJson(value), updatedBy: updatedBy ?? null },
    create: { key, value: asJson(value), updatedBy: updatedBy ?? null },
  });
  invalidateSettingsCache();
  return { key: row.key, value: row.value };
}

export async function listDepartments() {
  return prisma.department.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(input: {
  name: string;
  description?: string | null;
}) {
  return prisma.department.create({
    data: {
      name: input.name,
      description: input.description ?? null,
    },
  });
}

export async function updateDepartment(
  id: string,
  input: { name?: string; description?: string | null },
) {
  return prisma.department.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    where: { role: { not: "PATIENT" } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      staff: {
        select: {
          id: true,
          employeeCode: true,
          designation: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { email: "asc" },
  });
}

export async function setUserActive(
  targetUserId: string,
  isActive: boolean,
  actorUserId: string,
) {
  if (!isActive && targetUserId === actorUserId) {
    throw new Error("SELF_DEACTIVATE");
  }
  return prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: { id: true, email: true, role: true, isActive: true, name: true },
  });
}

export async function changeUserRole(
  targetUserId: string,
  role: string,
  _actorUserId: string,
) {
  const target = await prisma.user.findUniqueOrThrow({
    where: { id: targetUserId },
  });

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (activeAdmins <= 1 && target.isActive) {
      throw new Error("LAST_ADMIN");
    }
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role: role as never },
    select: { id: true, email: true, role: true, isActive: true, name: true },
  });
}
