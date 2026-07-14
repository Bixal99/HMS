/**
 * Route-group marker for admin portal URLs.
 * Auth is enforced by pages + AuthenticatedShell (avoids Next.js
 * Performance.measure negative-timestamp crashes from layout redirects).
 */
export default function AdminPortalRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
