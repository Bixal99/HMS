import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NurseDashboardPage() {
  return (
    <AuthenticatedShell>
      <PageEnter>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Nurse dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Check patients in from the live queue, or manage ward beds.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/appointments/queue">Today&apos;s queue</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/wards">Ward occupancy</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/inventory">Inventory</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageEnter>
    </AuthenticatedShell>
  );
}
