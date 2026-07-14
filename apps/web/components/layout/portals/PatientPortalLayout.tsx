import { PortalShell } from "@/components/layout/portals/PortalShell";

/** Patient portal chrome — appointments, records, bills. */
export async function PatientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell portal="patient">{children}</PortalShell>;
}
