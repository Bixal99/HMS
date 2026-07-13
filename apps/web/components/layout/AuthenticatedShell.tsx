import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSessionToken } from "@shared/auth";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { CriticalLabAlertListener } from "@/components/lab/CriticalLabAlertListener";
import { homeForRole } from "@/lib/role-routes";

export async function requireSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const user = await validateSessionToken(prisma, token);
  if (!user) redirect("/login");
  return user;
}

async function pendingLeaveBadge(role: string, cookieHeader: string) {
  if (role !== "ADMIN") return 0;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/staff/leave-requests/pending-count`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      },
    );
    if (!res.ok) return 0;
    const body = (await res.json()) as { count: number };
    return body.count ?? 0;
  } catch {
    return 0;
  }
}

async function pharmacyAlertBadge(role: string, cookieHeader: string) {
  if (!["PHARMACIST", "ADMIN"].includes(role)) return 0;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/pharmacy/alerts/count`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      },
    );
    if (!res.ok) return 0;
    const body = (await res.json()) as { count: number };
    return body.count ?? 0;
  } catch {
    return 0;
  }
}

async function inventoryAlertBadge(role: string, cookieHeader: string) {
  if (!["ADMIN", "NURSE", "LAB_TECHNICIAN"].includes(role)) return 0;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/inventory/alerts/count`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      },
    );
    if (!res.ok) return 0;
    const body = (await res.json()) as { count: number };
    return body.count ?? 0;
  } catch {
    return 0;
  }
}

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireSessionUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const [pending, pharmacyAlerts, inventoryAlerts] = await Promise.all([
    pendingLeaveBadge(user.role, cookieHeader),
    pharmacyAlertBadge(user.role, cookieHeader),
    inventoryAlertBadge(user.role, cookieHeader),
  ]);

  const nav: NavItem[] = [{ href: homeForRole(user.role), label: "Dashboard" }];

  if (
    ["ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "BILLING_OFFICER"].includes(user.role)
  ) {
    nav.push({ href: "/patients", label: "Patients" });
  }

  if (["ADMIN", "RECEPTIONIST"].includes(user.role)) {
    nav.push({ href: "/staff", label: "Staff directory" });
  }

  if (["ADMIN", "RECEPTIONIST", "PATIENT"].includes(user.role)) {
    nav.push({ href: "/appointments/book", label: "Book appointment" });
  }

  if (["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"].includes(user.role)) {
    nav.push({ href: "/appointments/queue", label: "Today's queue" });
  }

  if (["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"].includes(user.role)) {
    nav.push({ href: "/wards", label: "Ward occupancy" });
  }

  if (["PHARMACIST", "ADMIN"].includes(user.role)) {
    nav.push({ href: "/pharmacy/queue", label: "Pharmacy queue" });
    nav.push({ href: "/pharmacy/purchase-orders", label: "Purchase orders" });
    nav.push({
      href: "/pharmacy/alerts",
      label: "Pharmacy alerts",
      badge: pharmacyAlerts,
    });
  }

  if (["LAB_TECHNICIAN", "ADMIN"].includes(user.role)) {
    nav.push({ href: "/lab/queue", label: "Lab queue" });
  }

  if (["ADMIN", "NURSE", "LAB_TECHNICIAN"].includes(user.role)) {
    nav.push({
      href: "/inventory/alerts",
      label: "Inventory alerts",
      badge: inventoryAlerts,
    });
    nav.push({ href: "/inventory/equipment", label: "Equipment" });
    nav.push({ href: "/inventory", label: "Inventory" });
  }

  if (["BILLING_OFFICER", "ADMIN"].includes(user.role)) {
    nav.push({ href: "/billing", label: "Invoices" });
  }

  if (user.role === "ADMIN") {
    nav.push({ href: "/reports/operational", label: "Operational report" });
    nav.push({ href: "/admin/audit-logs", label: "Audit logs" });
  }
  if (["ADMIN", "BILLING_OFFICER"].includes(user.role)) {
    nav.push({ href: "/reports/financial", label: "Financial report" });
  }
  if (["ADMIN", "DOCTOR"].includes(user.role)) {
    nav.push({ href: "/reports/clinical", label: "Clinical report" });
  }

  if (["DOCTOR", "NURSE", "PHARMACIST", "LAB_TECHNICIAN", "ADMIN"].includes(user.role)) {
    nav.push({ href: "/staff/availability", label: "My availability" });
  }

  if (user.role === "ADMIN") {
    nav.push({ href: "/staff/leave", label: "Leave inbox", badge: pending });
    nav.push({ href: "/settings", label: "Settings" });
  }

  return (
    <AppShell
      user={{ email: user.email, role: user.role, name: user.name }}
      nav={nav}
    >
      {user.role === "DOCTOR" ? <CriticalLabAlertListener enabled /> : null}
      {children}
    </AppShell>
  );
}
