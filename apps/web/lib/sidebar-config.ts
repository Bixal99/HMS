import type { NavGroup, NavIconName } from "@/components/layout/AppShell";
import type { Actions, Subjects } from "@shared/auth";
import { homeForRole } from "@/lib/role-routes";
import type { Portal } from "@/lib/portal";

export type BadgeKey =
  | "leavePending"
  | "pharmacyAlerts"
  | "pharmacyQueue"
  | "labQueue"
  | "radiologyQueue"
  | "billingAlerts"
  | "patientUnpaid"
  | "inventoryAlerts"
  | "notificationsUnread"
  | "appointmentPending";

export type SidebarItemDef = {
  href: string;
  label: string;
  icon?: NavIconName;
  /** Roles that see this item (parity with previous AuthenticatedShell). */
  roles: string[];
  /** Optional portal restriction; if set, item only appears in that portal shell. */
  portals?: Portal[];
  badgeKey?: BadgeKey;
  /** When ability wiring is active, prefer this over roles if provided. */
  ability?: [Actions, Subjects];
};

export type SidebarGroupDef = {
  title: string;
  items: SidebarItemDef[];
};

export const sidebarConfig: SidebarGroupDef[] = [
  {
    title: "Overview",
    items: [
      {
        href: "__HOME__",
        label: "Dashboard",
        icon: "layout",
        roles: [
          "ADMIN",
          "DOCTOR",
          "NURSE",
          "RECEPTIONIST",
          "PHARMACIST",
          "LAB_TECHNICIAN",
          "BILLING_OFFICER",
          "PATIENT",
        ],
        badgeKey: "patientUnpaid",
      },
    ],
  },
  {
    title: "Care",
    items: [
      {
        href: "/portal/appointments",
        label: "My appointments",
        icon: "calendar",
        roles: ["PATIENT"],
        portals: ["patient"],
        ability: ["read", "Appointment"],
      },
      {
        href: "/appointments/book",
        label: "Book appointment",
        icon: "calendar",
        roles: ["PATIENT"],
        portals: ["patient"],
        ability: ["create", "Appointment"],
      },
      {
        href: "/appointments/book",
        label: "Book appointment",
        icon: "calendar",
        roles: ["ADMIN", "RECEPTIONIST"],
        portals: ["admin", "staff"],
        ability: ["create", "Appointment"],
      },
      {
        href: "/appointments/pending",
        label: "Pending requests",
        icon: "clipboard",
        roles: ["ADMIN", "RECEPTIONIST"],
        portals: ["admin", "staff"],
        ability: ["read", "Appointment"],
        badgeKey: "appointmentPending",
      },
      {
        href: "/appointments/queue",
        label: "Today's queue",
        icon: "clipboard",
        roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"],
        portals: ["admin", "staff"],
        ability: ["read", "Appointment"],
      },
      {
        href: "/patients",
        label: "Patients",
        icon: "users",
        roles: ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "BILLING_OFFICER"],
        portals: ["admin", "staff"],
        ability: ["read", "Patient"],
      },
      {
        href: "/staff",
        label: "Staff directory",
        icon: "stethoscope",
        roles: ["ADMIN", "RECEPTIONIST"],
        portals: ["admin", "staff"],
        ability: ["read", "Staff"],
      },
      {
        href: "/wards",
        label: "Ward occupancy",
        icon: "bed",
        roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"],
        portals: ["admin", "staff"],
        ability: ["read", "Ward"],
      },
      {
        href: "/wards/nursing",
        label: "Nursing board",
        icon: "activity",
        roles: ["NURSE", "ADMIN"],
        portals: ["admin", "staff"],
        ability: ["read", "Admission"],
      },
      {
        href: "/surgery/board",
        label: "Surgery board",
        icon: "activity",
        roles: ["ADMIN", "DOCTOR", "RECEPTIONIST"],
        portals: ["admin", "staff"],
      },
    ],
  },
  {
    title: "Records",
    items: [
      {
        href: "/portal/prescriptions",
        label: "Prescriptions",
        icon: "pill",
        roles: ["PATIENT"],
        portals: ["patient"],
      },
      {
        href: "/portal/visits",
        label: "Visits & summaries",
        icon: "clipboard",
        roles: ["PATIENT"],
        portals: ["patient"],
      },
      {
        href: "/portal/lab",
        label: "Lab results",
        icon: "flask",
        roles: ["PATIENT"],
        portals: ["patient"],
      },
      {
        href: "/portal/imaging",
        label: "Imaging",
        icon: "scan",
        roles: ["PATIENT"],
        portals: ["patient"],
      },
      {
        href: "/portal/bills",
        label: "Bills",
        icon: "receipt",
        roles: ["PATIENT"],
        portals: ["patient"],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/pharmacy/queue",
        label: "Pharmacy queue",
        icon: "pill",
        roles: ["PHARMACIST", "ADMIN"],
        portals: ["admin", "staff"],
        badgeKey: "pharmacyQueue",
        ability: ["read", "Dispense"],
      },
      {
        href: "/pharmacy/purchase-orders",
        label: "Purchase orders",
        icon: "cart",
        roles: ["PHARMACIST", "ADMIN"],
        portals: ["admin", "staff"],
        ability: ["manage", "PurchaseOrder"],
      },
      {
        href: "/pharmacy/alerts",
        label: "Pharmacy alerts",
        icon: "alert",
        roles: ["PHARMACIST", "ADMIN"],
        portals: ["admin", "staff"],
        badgeKey: "pharmacyAlerts",
        ability: ["read", "Medicine"],
      },
      {
        href: "/lab/queue",
        label: "Lab queue",
        icon: "flask",
        roles: ["LAB_TECHNICIAN", "ADMIN"],
        portals: ["admin", "staff"],
        badgeKey: "labQueue",
        ability: ["manage", "LabOrder"],
      },
      {
        href: "/radiology/queue",
        label: "Imaging queue",
        icon: "scan",
        roles: ["LAB_TECHNICIAN", "ADMIN"],
        portals: ["admin", "staff"],
        badgeKey: "radiologyQueue",
      },
      {
        href: "/inventory/alerts",
        label: "Inventory alerts",
        icon: "alert",
        roles: ["ADMIN", "NURSE", "LAB_TECHNICIAN"],
        portals: ["admin", "staff"],
        badgeKey: "inventoryAlerts",
        ability: ["read", "InventoryItem"],
      },
      {
        href: "/inventory/equipment",
        label: "Equipment",
        icon: "wrench",
        roles: ["ADMIN", "NURSE", "LAB_TECHNICIAN"],
        portals: ["admin", "staff"],
        ability: ["read", "Equipment"],
      },
      {
        href: "/inventory",
        label: "Inventory",
        icon: "package",
        roles: ["ADMIN", "NURSE", "LAB_TECHNICIAN"],
        portals: ["admin", "staff"],
        ability: ["read", "InventoryItem"],
      },
      {
        href: "/billing",
        label: "Invoices",
        icon: "receipt",
        roles: ["BILLING_OFFICER", "ADMIN"],
        portals: ["admin", "staff"],
        badgeKey: "billingAlerts",
        ability: ["manage", "Invoice"],
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/reports/operational",
        label: "Operational report",
        icon: "file",
        roles: ["ADMIN"],
        portals: ["admin"],
        ability: ["read", "OperationalReport"],
      },
      {
        href: "/admin/audit-logs",
        label: "Audit logs",
        icon: "clipboard",
        roles: ["ADMIN"],
        portals: ["admin"],
        ability: ["read", "AuditLog"],
      },
      {
        href: "/reports/financial",
        label: "Financial report",
        icon: "file",
        roles: ["ADMIN", "BILLING_OFFICER"],
        portals: ["admin", "staff"],
        ability: ["read", "FinancialReport"],
      },
      {
        href: "/reports/clinical",
        label: "Clinical report",
        icon: "file",
        roles: ["ADMIN", "DOCTOR"],
        portals: ["admin", "staff"],
        ability: ["read", "ClinicalReport"],
      },
      {
        href: "/staff/availability",
        label: "My availability",
        icon: "calendar",
        roles: ["DOCTOR", "NURSE", "PHARMACIST", "LAB_TECHNICIAN", "ADMIN"],
        portals: ["admin", "staff"],
        ability: ["manage", "StaffAvailability"],
      },
      {
        href: "/staff/leave",
        label: "Leave inbox",
        icon: "clipboard",
        roles: ["ADMIN"],
        portals: ["admin"],
        badgeKey: "leavePending",
        ability: ["manage", "StaffLeaveRequest"],
      },
    ],
  },
  {
    title: "Hospital Configuration",
    items: [
      {
        href: "/staff",
        label: "Staff Management",
        icon: "stethoscope",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
      {
        href: "/settings?tab=departments",
        label: "Department Management",
        icon: "layout",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
      {
        href: "/settings?tab=specialties",
        label: "Specialty Management",
        icon: "layout",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
      {
        href: "/staff/availability",
        label: "Doctor Schedules",
        icon: "calendar",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
      {
        href: "/admin/wards",
        label: "Room & Ward Management",
        icon: "bed",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
      {
        href: "/admin/medicines",
        label: "Medicine Management",
        icon: "pill",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
      {
        href: "/admin/lab-catalog",
        label: "Lab & Imaging Test Management",
        icon: "flask",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
      {
        href: "/admin/billing-catalog",
        label: "Billing & Service Catalog",
        icon: "receipt",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
      {
        href: "/settings",
        label: "Hospital Settings",
        icon: "wrench",
        roles: ["ADMIN"],
        portals: ["admin"],
      },
    ],
  },
];

export type BadgeCounts = Partial<Record<BadgeKey, number>>;

type AbilityLike = { can: (action: Actions, subject: Subjects) => boolean };

/**
 * Build nav groups for a user. Uses role allowlists for parity; when
 * `useAbilities` is true and an item has `ability`, that check is required too.
 */
export function buildNavGroups(options: {
  role: string;
  portal: Portal;
  badges?: BadgeCounts;
  ability?: AbilityLike;
  useAbilities?: boolean;
}): NavGroup[] {
  const { role, portal, badges = {}, ability, useAbilities = false } = options;

  return sidebarConfig
    .map((group) => {
      const items = group.items
        .filter((item) => {
          if (item.portals && !item.portals.includes(portal)) return false;
          if (!item.roles.includes(role)) return false;
          if (useAbilities && item.ability && ability) {
            const [action, subject] = item.ability;
            if (!ability.can(action, subject)) return false;
          }
          return true;
        })
        .map((item) => {
          const href = item.href === "__HOME__" ? homeForRole(role) : item.href;
          let badge: number | undefined;
          if (item.badgeKey === "patientUnpaid" && role === "PATIENT") {
            badge = badges.patientUnpaid;
          } else if (item.badgeKey && item.badgeKey !== "patientUnpaid") {
            badge = badges[item.badgeKey];
          }
          return {
            href,
            label: item.label,
            icon: item.icon,
            badge: badge && badge > 0 ? badge : undefined,
          };
        });
      return { title: group.title, items };
    })
    .filter((g) => g.items.length > 0);
}
