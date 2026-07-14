import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { RoleHomeDashboard, RoleIcons } from "@/components/dashboard/RoleHomeDashboard";
import { loadRoleDashboardCounts } from "@/lib/dashboard-counts";
import {
  billingAttentionSeries,
  claimsByStatusSeries,
  invoiceStatusSeries,
  paymentsByDaySeries,
  revenueByCategorySeries,
} from "@/lib/role-dashboard-series";
import { requireDashboardRole } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function BillingDashboardPage() {
  const user = await requireSessionUser();
  requireDashboardRole(user, "BILLING_OFFICER");

  const counts = await loadRoleDashboardCounts("BILLING_OFFICER");
  const billingAlerts = counts.billingAlerts ?? 0;

  const [alertsChart, revenue, claims, payments] = await Promise.all([
    billingAttentionSeries(billingAlerts),
    revenueByCategorySeries(),
    claimsByStatusSeries(),
    paymentsByDaySeries(),
  ]);

  // Prefer revenue by category; fall back to invoice status if empty
  const second =
    revenue.rows.length > 0 ? revenue : await invoiceStatusSeries();

  return (
    <AuthenticatedShell>
      <PageEnter>
        <RoleHomeDashboard
          title="Billing dashboard"
          description="Generate invoices from clinical activity and record desk payments."
          heroTitle="Cash desk & claims"
          heroBody="Clear billing alerts, generate invoices from patient charges, and review financial reports."
          illustrationSrc="/illustrations/auth-register.svg"
          kpis={[
            {
              label: "Billing alerts",
              value: billingAlerts,
              icon: RoleIcons.AlertTriangle,
              tone: billingAlerts > 0 ? "warning" : "success",
              hint: "Needs attention",
            },
            {
              label: "Invoices desk",
              value: billingAlerts > 0 ? "Attention" : "Clear",
              icon: RoleIcons.Receipt,
              hint: "Payments & voids",
              tone: billingAlerts > 0 ? "warning" : "success",
            },
            {
              label: "Financial report",
              value: "Available",
              icon: RoleIcons.ClipboardList,
              hint: "Revenue & claims",
            },
            {
              label: "Patient lookup",
              value: "Ready",
              icon: RoleIcons.Users,
              hint: "Insurance fields",
            },
          ]}
          charts={[alertsChart, second, claims, payments]}
          actions={[
            {
              href: "/billing",
              label: "Open invoices",
              variant: "default",
              icon: RoleIcons.Receipt,
            },
            {
              href: "/reports/financial",
              label: "Financial report",
              icon: RoleIcons.ClipboardList,
            },
            {
              href: "/patients",
              label: "Patient directory",
              icon: RoleIcons.Users,
            },
          ]}
        />
      </PageEnter>
    </AuthenticatedShell>
  );
}
