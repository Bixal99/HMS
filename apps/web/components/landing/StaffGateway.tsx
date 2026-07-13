import Link from "next/link";
import { Button } from "@/components/ui/button";

export function StaffGateway() {
  return (
    <section
      className="landing-section px-6 py-16 md:px-10 md:py-20"
      aria-labelledby="staff-heading"
      data-reveal-item
    >
      <div className="landing-staff mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl border border-border/80 bg-primary px-8 py-10 text-primary-foreground shadow-lg md:flex-row md:items-center md:px-12">
        <div className="max-w-xl">
          <h2 id="staff-heading" className="landing-display text-2xl font-medium md:text-3xl">
            Hospital staff?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80 md:text-base">
            Doctors, nurses, reception, pharmacy, lab, and admin sign in with accounts
            provisioned by your administrator.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="shrink-0 bg-white text-primary hover:bg-white/90"
          data-cursor="pointer"
        >
          <Link href="/login">Staff sign in</Link>
        </Button>
      </div>
    </section>
  );
}
