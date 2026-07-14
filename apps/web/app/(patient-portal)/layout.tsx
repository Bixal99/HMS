/**
 * Route-group marker for patient portal URLs.
 *
 * Auth/portal checks live on pages + AuthenticatedShell — not here.
 * Calling redirect() inside async layouts can crash Turbopack/React
 * Performance.measure with "negative time stamp" in Next.js 16.
 */
export default function PatientPortalRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
