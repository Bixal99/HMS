"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaBanner({
  allowRegistration = true,
}: {
  allowRegistration?: boolean;
}) {
  return (
    <section className="px-[clamp(1.25rem,3vw,2.5rem)] py-12 md:py-16">
      <div className="mkt-cta-banner">
        <div>
          <h2 className="landing-display text-2xl font-semibold md:text-3xl">
            Ready for your next visit?
          </h2>
          <p>
            Create a patient account or sign in to book with your preferred
            department.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90"
          >
            <Link href={allowRegistration ? "/register" : "/login"}>
              {allowRegistration ? "Register" : "Sign in"}
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10"
          >
            <Link href="/login">Staff sign-in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
