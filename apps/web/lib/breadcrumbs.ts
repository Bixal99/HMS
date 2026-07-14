import { homeForRole } from "@/lib/role-routes";
import { indexRedirectFor, INDEX_PARENT_SEGMENTS } from "@/lib/nav-index-routes";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  pharmacy: "Pharmacy",
  lab: "Lab",
  billing: "Billing",
  portal: "Dashboard",
  prescriptions: "Prescriptions",
  visits: "Visits",
  imaging: "Imaging",
  bills: "Bills",
  pending: "Pending requests",
  notifications: "Notifications",
  appointments: "Appointments",
  book: "Book",
  queue: "Queue",
  intake: "Intake",
  encounters: "Encounters",
  wards: "Wards",
  nursing: "Nursing",
  surgery: "Surgery",
  board: "Board",
  alerts: "Alerts",
  "purchase-orders": "Purchase orders",
  radiology: "Imaging",
  inventory: "Inventory",
  equipment: "Equipment",
  reconcile: "Reconcile",
  reports: "Reports",
  operational: "Operational",
  financial: "Financial",
  clinical: "Clinical",
  staff: "Staff",
  availability: "Availability",
  leave: "Leave inbox",
  settings: "Settings",
  "audit-logs": "Audit logs",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function labelForSegment(segment: string, parent?: string): string {
  if (UUID_RE.test(segment)) {
    if (parent === "patients") return "Chart";
    if (parent === "encounters") return "Visit";
    if (parent === "billing") return "Invoice";
    if (parent === "appointments") return "Details";
    return "Details";
  }
  if (segment === "lab" && parent === "portal") return "Lab results";
  return (
    SEGMENT_LABELS[segment] ??
    segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

/**
 * Build header breadcrumbs for any authenticated role from the URL.
 * Parents are linkable; the last crumb is the current page (no href).
 */
export function breadcrumbsFromPath(
  pathname: string,
  role?: string,
): BreadcrumbItem[] {
  const home = role ? homeForRole(role) : "/";
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return [{ label: "Home", href: home }];
  }

  if (parts[0] === "dashboard" && parts.length === 2) {
    return [{ label: "Dashboard" }];
  }
  if (parts[0] === "portal" && parts.length === 1) {
    return [{ label: "Dashboard" }];
  }

  const crumbs: BreadcrumbItem[] = [];

  if (role === "PATIENT") {
    crumbs.push({ label: "Dashboard", href: "/portal" });
    if (parts[0] === "portal" && parts.length === 1) {
      return [{ label: "Dashboard" }];
    }
  }

  let href = "";
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    href += `/${segment}`;
    const parent = i > 0 ? parts[i - 1] : undefined;
    const label = labelForSegment(segment, parent);
    const isLast = i === parts.length - 1;

    if (segment === "dashboard" && parts.length > 2) continue;
    if (role === "PATIENT" && segment === "portal" && parts.length > 1) continue;

    if (
      role === "PATIENT" &&
      segment === "appointments" &&
      parts[0] === "appointments"
    ) {
      crumbs.push({
        label: "Book",
        href: isLast ? undefined : href,
      });
      continue;
    }

    if (!isLast && INDEX_PARENT_SEGMENTS.has(segment) && role) {
      const target = indexRedirectFor(segment, role) ?? href;
      crumbs.push({ label, href: target });
      continue;
    }

    crumbs.push({
      label,
      href: isLast ? undefined : href,
    });
  }

  if (
    crumbs.length > 1 &&
    crumbs[0]?.label === "Dashboard" &&
    crumbs[1]?.label === "Dashboard"
  ) {
    return crumbs.slice(1);
  }

  return crumbs.length > 0 ? crumbs : [{ label: "Dashboard" }];
}
