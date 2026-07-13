import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DoctorDashboardPage() {
  return (
    <AuthenticatedShell>
      <PageEnter>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Doctor dashboard</CardTitle>
            <CardDescription>Clinical workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Open today&apos;s live queue, admit/discharge from ward occupancy, or browse patients.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/appointments/queue">Today&apos;s queue</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/wards">Ward occupancy</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports/clinical">Clinical report</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageEnter>
    </AuthenticatedShell>
  );
}
