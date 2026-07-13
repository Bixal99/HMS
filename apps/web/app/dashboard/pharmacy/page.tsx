import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PharmacyDashboardPage() {
  return (
    <AuthenticatedShell>
      <PageEnter>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Pharmacy dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Fulfill prescriptions, receive purchase orders, and watch stock alerts.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/pharmacy/queue">Fulfillment queue</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/pharmacy/purchase-orders">Purchase orders</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/pharmacy/alerts">Alerts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageEnter>
    </AuthenticatedShell>
  );
}
