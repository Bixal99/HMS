import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/AuthExperience";
import { InlineLoader } from "@/components/shared/InlineLoader";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-background">
          <InlineLoader label="Loading sign-in…" />
        </main>
      }
    >
      <AuthExperience initialMode="login" />
    </Suspense>
  );
}
