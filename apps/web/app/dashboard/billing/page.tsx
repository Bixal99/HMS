import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingDashboardPage() {
  return (
    <AuthenticatedShell>
      <PageEnter>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Billing dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Generate invoices from clinical activity and record desk payments.
            </p>
          </div>
            <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Generate from patient charges and manage payments, voids, and claims.</p>
                <Button asChild>
                  <Link href="/billing">Open invoices</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Revenue by category, outstanding balances, and claims.</p>
                <Button asChild variant="outline">
                  <Link href="/reports/financial">Open report</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Look up demographics and insurance fields for claim submission.</p>
                <Button asChild variant="outline">
                  <Link href="/patients">Patient directory</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageEnter>
    </AuthenticatedShell>
  );
}
