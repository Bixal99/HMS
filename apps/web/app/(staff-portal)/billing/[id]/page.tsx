import { AuthenticatedShell, requireSessionUser } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { InvoiceDetailView } from "@/components/billing/InvoiceDetailView";

export default async function BillingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();
  const role = user.role;

  const canPay = ["BILLING_OFFICER", "ADMIN", "RECEPTIONIST"].includes(role);
  const canVoid = ["BILLING_OFFICER", "ADMIN"].includes(role);
  const canClaim = ["BILLING_OFFICER", "ADMIN"].includes(role);
  const readOnlyNote =
    role === "PATIENT"
      ? "Please settle this balance at the billing desk. Online payment is not available."
      : undefined;

  return (
    <AuthenticatedShell>
      <PageEnter>
        <InvoiceDetailView
          invoiceId={id}
          canPay={canPay}
          canVoid={canVoid}
          canClaim={canClaim}
          readOnlyNote={readOnlyNote}
        />
      </PageEnter>
    </AuthenticatedShell>
  );
}
