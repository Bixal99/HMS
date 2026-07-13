import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { validateSessionToken } from "@shared/auth";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { homeForRole } from "@/lib/role-routes";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function requireUser(expectedRole?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const user = await validateSessionToken(prisma, token);
  if (!user) redirect("/login");

  if (expectedRole && user.role !== expectedRole) {
    redirect(homeForRole(user.role));
  }

  return user;
}

export async function RoleDashboard({
  title,
  role,
}: {
  title: string;
  role: string;
}) {
  const user = await requireUser(role);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-foreground">{title}</CardTitle>
          <CardDescription>
            Signed in as {user.email} ({user.role})
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Placeholder dashboard for Task 02. Business modules arrive in later tasks.
        </CardContent>
        <CardFooter>
          <div className="flex flex-wrap gap-2">
            <LogoutButton />
            {(user.role === "ADMIN" ||
              user.role === "RECEPTIONIST" ||
              user.role === "DOCTOR" ||
              user.role === "NURSE" ||
              user.role === "BILLING_OFFICER") && (
              <Button asChild variant="outline">
                <a href="/patients">Patients</a>
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
