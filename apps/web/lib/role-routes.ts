import { Role } from "../../api/src/generated/prisma/client";

export const roleRoutes: Record<Role, string> = {
  ADMIN: "/dashboard/admin",
  DOCTOR: "/dashboard/doctor",
  NURSE: "/dashboard/nurse",
  RECEPTIONIST: "/dashboard/receptionist",
  PHARMACIST: "/dashboard/pharmacy",
  LAB_TECHNICIAN: "/dashboard/lab",
  BILLING_OFFICER: "/dashboard/billing",
  PATIENT: "/portal",
};

export function homeForRole(role: string): string {
  return roleRoutes[role as Role] ?? "/login";
}
