"use client";

import { useEffect } from "react";
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
import "./landing.css";

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
    <div className="landing-root mkt-root">
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
