import { PortalShell } from "@/components/layout/portals/PortalShell";

/** Shared staff portal chrome — role-driven nav and listeners. */
export async function StaffPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell portal="staff">{children}</PortalShell>;
}
