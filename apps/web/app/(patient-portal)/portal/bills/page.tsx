import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { requireSessionUser } from "@/lib/session-user";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Page() {
  const user = await requireSessionUser();
  if (user.role !== "PATIENT") redirect("/");
  return (
    <AuthenticatedShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Bills</h1>
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">You don&apos;t have any invoices yet.</p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/portal">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </AuthenticatedShell>
  );
}
