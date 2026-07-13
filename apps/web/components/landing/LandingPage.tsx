"use client";

import { useEffect } from "react";
import { Poppins } from "next/font/google";
import { MarketingNav } from "./MarketingNav";
import { MarketingHero } from "./MarketingHero";
import { TrustedBy } from "./TrustedBy";
import { ServicesSection } from "./ServicesSection";
import { WhyUsSection } from "./WhyUsSection";
import { DepartmentsCarousel } from "./DepartmentsCarousel";
import { DoctorsCarousel } from "./DoctorsCarousel";
import { CtaBanner } from "./CtaBanner";
import { TestimonialsSection } from "./TestimonialsSection";
import { FaqSection } from "./FaqSection";
import { ContactSection } from "./ContactSection";
import { LandingFooter } from "./LandingFooter";
import { LandingCursor } from "./LandingCursor";
import { destroySmoothScroll, initSmoothScroll } from "@/lib/smoothScroll";
import { cn } from "@/lib/utils";
import "./landing.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing",
  display: "swap",
});

export function LandingPage({
  allowRegistration = true,
}: {
  allowRegistration?: boolean;
}) {
  useEffect(() => {
    initSmoothScroll();
    return () => destroySmoothScroll();
  }, []);

  return (
    <div className={cn("landing-root mkt-root", poppins.variable)}>
      <LandingCursor />
      <MarketingNav allowRegistration={allowRegistration} />
      <main>
        <MarketingHero allowRegistration={allowRegistration} />
        <TrustedBy />
        <ServicesSection />
        <WhyUsSection />
        <DepartmentsCarousel />
        <DoctorsCarousel allowRegistration={allowRegistration} />
        <CtaBanner allowRegistration={allowRegistration} />
        <TestimonialsSection />
        <FaqSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
