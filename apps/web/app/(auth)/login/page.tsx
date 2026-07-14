import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/AuthExperience";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <AuthExperience initialMode="login" />
    </Suspense>
  );
}
