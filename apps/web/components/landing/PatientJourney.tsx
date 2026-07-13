"use client";

import Link from "next/link";
import {
  CalendarCheck,
  ClipboardList,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    step: "01",
    title: "Register",
    body: "Create your patient account once — name, contact, and basics become your hospital profile.",
    icon: UserPlus,
    href: "/register",
  },
  {
    step: "02",
    title: "Book",
    body: "Pick a doctor and open slot. Reception and the clinic queue see your booking automatically.",
    icon: CalendarCheck,
    href: "/appointments/book",
  },
  {
    step: "03",
    title: "Visit",
    body: "Check in, see the clinician, and leave with notes, prescriptions, and lab orders linked to you.",
    icon: Stethoscope,
    href: null,
  },
  {
    step: "04",
    title: "Portal",
    body: "Review finalized visit summaries and book follow-ups from your patient portal.",
    icon: ClipboardList,
    href: "/portal",
  },
] as const;

export function PatientJourney() {
  return (
    <section
      className="landing-section landing-section--muted px-6 py-20 md:px-10 md:py-28"
      aria-labelledby="journey-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="landing-eyebrow">Patient journey</p>
          <h2
            id="journey-heading"
            className="landing-display mt-3 text-3xl font-medium tracking-tight text-foreground md:text-4xl"
          >
            From first signup to follow-up care
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            MediCore is built around you: register yourself, book visits, and keep every
            department working from the same synced record.
          </p>
        </div>

        <ol className="landing-journey mt-14">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const inner = (
              <>
                <div className="landing-journey__icon" aria-hidden>
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <span className="landing-journey__step">{item.step}</span>
                <h3 className="landing-journey__title">{item.title}</h3>
                <p className="landing-journey__body">{item.body}</p>
                {item.href ? (
                  <span className="landing-journey__cta">Continue →</span>
                ) : null}
              </>
            );

            return (
              <li
                key={item.step}
                data-reveal-item
                data-cursor="pointer"
                className={cn(
                  "landing-journey__card",
                  index < STEPS.length - 1 && "landing-journey__card--connector",
                )}
              >
                {item.href ? (
                  <Link href={item.href} className="landing-journey__link">
                    {inner}
                  </Link>
                ) : (
                  <div className="landing-journey__link">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
