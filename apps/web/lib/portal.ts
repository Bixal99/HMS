export type Portal = "admin" | "staff" | "patient";

const STAFF_ROLES = new Set([
  "RECEPTIONIST",
  "DOCTOR",
  "NURSE",
  "LAB_TECHNICIAN",
  "PHARMACIST",
  "BILLING_OFFICER",
]);

export function portalForRole(role: string): Portal {
  if (role === "ADMIN") return "admin";
  if (role === "PATIENT") return "patient";
  if (STAFF_ROLES.has(role)) return "staff";
  return "staff";
}

export function rolesForPortal(portal: Portal): string[] {
  switch (portal) {
    case "admin":
      return ["ADMIN"];
    case "patient":
      return ["PATIENT"];
    case "staff":
      return [
        "RECEPTIONIST",
        "DOCTOR",
        "NURSE",
        "LAB_TECHNICIAN",
        "PHARMACIST",
        "BILLING_OFFICER",
      ];
  }
}

/** Admin may open staff-portal pages for oversight; patient portal is exclusive. */
export function roleMayAccessPortal(role: string, portal: Portal): boolean {
  const userPortal = portalForRole(role);
  if (userPortal === portal) return true;
  if (role === "ADMIN" && portal === "staff") return true;
  return false;
}
