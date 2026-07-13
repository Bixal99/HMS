import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <AuthenticatedShell>
      <PageEnter>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Admin dashboard</CardTitle>
            <CardDescription>Operations overview — more widgets in later tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Use the sidebar for Patients, Staff directory, and Leave inbox.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/inventory">Inventory</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/inventory/reconcile">Reconcile stock</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/billing">Invoices</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports/operational">Operational</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports/financial">Financial</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports/clinical">Clinical</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings">Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageEnter>
    </AuthenticatedShell>
  );
}
