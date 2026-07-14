/**
 * Route-group marker for staff portal URLs.
 * Auth is enforced by pages + AuthenticatedShell (avoids Next.js
 * Performance.measure negative-timestamp crashes from layout redirects).
 */
export default function StaffPortalRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
