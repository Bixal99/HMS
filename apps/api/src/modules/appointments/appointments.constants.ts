import type { AppointmentStatus } from "../../generated/prisma/client";

/** Statuses that hold a doctor+time slot (partial unique index). */
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
];

export const NON_BLOCKING_STATUSES: AppointmentStatus[] = [
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
];

export const DOCTOR_VISIBLE_STATUSES: AppointmentStatus[] = [
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
  "NO_SHOW",
];

export function apiError(
  code: string,
  message: string,
  action?: string,
  status = 400,
) {
  return { success: false as const, code, message, action, status };
}

export type ApiErrorBody = ReturnType<typeof apiError>;
