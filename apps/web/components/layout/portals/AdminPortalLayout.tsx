import { PortalShell } from "@/components/layout/portals/PortalShell";

/** Admin portal chrome — analytics, users, settings, oversight nav. */
export async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell portal="admin">{children}</PortalShell>;
}
