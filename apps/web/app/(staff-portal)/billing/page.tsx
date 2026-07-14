import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { InvoiceBuilder } from "@/components/billing/InvoiceBuilder";
import { Button } from "@/components/ui/button";
import { requireAbility } from "@/lib/require-portal";
import { requireSessionUser } from "@/lib/session-user";

export default async function BillingPage() {
  const user = await requireSessionUser();
  requireAbility(user, "manage", "Invoice");

  return (
    <AuthenticatedShell>
      <PageEnter>
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
              <p className="text-sm text-muted-foreground">
                Aggregate unbilled encounters, pharmacy, lab, and bed charges.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/billing">Billing dashboard</Link>
            </Button>
          </div>

          <InvoiceBuilder />

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">All invoices</h2>
            <InvoiceList />
          </section>
        </div>
      </PageEnter>
    </AuthenticatedShell>
  );
}
