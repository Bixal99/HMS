"use client";

import {
  BedDouble,
  Calendar,
  FileHeart,
  FlaskConical,
  Pill,
} from "lucide-react";
import { FeatureCard } from "./FeatureCard";

const FEATURES = [
  {
    title: "Appointments & live queue",
    description:
      "Book a slot online, check in at reception, and follow today’s clinic queue in real time.",
    icon: Calendar,
    accent: "hsl(217 91% 45%)",
  },
  {
    title: "Patients & clinical records",
    description:
      "Your allergies, documents, and visit notes stay linked to one profile after you register.",
    icon: FileHeart,
    accent: "hsl(199 89% 42%)",
  },
  {
    title: "Pharmacy stock & dispensing",
    description:
      "Prescriptions flow to the pharmacy with FEFO batch control so the right medicine reaches you.",
    icon: Pill,
    accent: "hsl(162 63% 36%)",
  },
  {
    title: "Laboratory ordering",
    description:
      "Tests ordered in your visit appear on the lab board; critical results alert your clinician.",
    icon: FlaskConical,
    accent: "hsl(262 52% 48%)",
  },
  {
    title: "Ward & bed occupancy",
    description:
      "Admissions, transfers, and discharges update a live bed board for nursing teams.",
    icon: BedDouble,
    accent: "hsl(24 90% 48%)",
  },
] as const;

export function FeatureGrid() {
  return (
    <section
      className="landing-section px-6 py-20 md:px-10 md:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="landing-eyebrow">What stays in sync</p>
          <h2
            id="features-heading"
            className="landing-display mt-3 text-3xl font-medium tracking-tight text-foreground md:text-4xl"
          >
            One record. Every department.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            After you register, appointments, consultations, pharmacy, lab, and wards
            share the same patient identity — so care teams work from the same truth.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                accent={feature.accent}
                icon={<Icon className="size-5" strokeWidth={1.75} />}
                className={
                  feature.title === "Ward & bed occupancy"
                    ? "sm:col-span-2 lg:col-span-1"
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
