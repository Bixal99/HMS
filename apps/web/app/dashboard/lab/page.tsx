import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LabDashboardPage() {
  return (
    <AuthenticatedShell>
      <PageEnter>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Lab dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Process ordered tests, enter results, and flag critical values.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/lab/queue">Open lab queue</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/inventory/equipment">Equipment</Link>
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
