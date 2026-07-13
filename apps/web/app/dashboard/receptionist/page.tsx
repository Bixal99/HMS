import Link from "next/link";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { PageEnter } from "@/components/shared/PageEnter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReceptionistDashboardPage() {
  return (
    <AuthenticatedShell>
      <PageEnter>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Reception dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Register patients and book appointments into doctor schedules.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/appointments/book">Book appointment</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/patients/new">Register patient</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageEnter>
    </AuthenticatedShell>
  );
}
