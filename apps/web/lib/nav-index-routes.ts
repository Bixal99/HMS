import { homeForRole } from "@/lib/role-routes";

/**
 * Parent URL segments that have no list page — breadcrumbs link here and
 * index routes redirect using these targets.
 */
export function indexRedirectFor(
  segment: string,
  role: string,
): string | null {
  switch (segment) {
    case "reports":
      if (role === "ADMIN") return "/reports/operational";
      if (role === "BILLING_OFFICER") return "/reports/financial";
      if (role === "DOCTOR") return "/reports/clinical";
      return homeForRole(role);
    case "appointments":
      if (role === "PATIENT") return "/portal/appointments";
      if (role === "RECEPTIONIST" || role === "ADMIN") return "/appointments/pending";
      return "/appointments/queue";
    case "lab":
      return "/lab/queue";
    case "radiology":
      return "/radiology/queue";
    case "pharmacy":
      if (role === "PHARMACIST" || role === "ADMIN") return "/pharmacy/queue";
      return homeForRole(role);
    case "surgery":
      return "/surgery/board";
    case "admin":
      return role === "ADMIN" ? "/admin/audit-logs" : homeForRole(role);
    case "dashboard":
      return homeForRole(role);
    case "inventory":
      return "/inventory";
    case "wards":
      return "/wards";
    case "staff":
      return role === "ADMIN" || role === "RECEPTIONIST"
        ? "/staff"
        : "/staff/availability";
    case "billing":
      return role === "PATIENT" ? "/portal/bills" : "/billing";
    case "encounters":
      return homeForRole(role);
    default:
      return null;
  }
}

/** Segments that should use indexRedirectFor as breadcrumb parent hrefs. */
export const INDEX_PARENT_SEGMENTS = new Set([
  "reports",
  "appointments",
  "lab",
  "radiology",
  "pharmacy",
  "surgery",
  "admin",
  "dashboard",
  "staff",
  "encounters",
]);
