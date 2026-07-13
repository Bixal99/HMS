"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MediCoreMark } from "@/components/brand/MediCoreMark";
import { HeartbeatPulse } from "@/components/brand/HeartbeatPulse";
import { CareNetworkVisual } from "@/components/landing/CareNetworkVisual";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";
import { BRAND_TAGLINE } from "@/lib/brand";
import { buttonPress } from "@/lib/microInteractions";
import {
  animateHeadlineWords,
  countUpOnScroll,
  splitHeadlineWords,
} from "@/lib/marketing-motion";
import { landingHeroEntrance } from "@/lib/landing-motion";

type Stats = {
  doctorCount: number;
  departmentCount: number;
  patientCount: number;
};

export function MarketingHero({
  allowRegistration = true,
}: {
  allowRegistration?: boolean;
}) {
  const markRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const supportRef = useRef<HTMLParagraphElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const primaryCtaWrapRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/public/stats`);
      if (!res.ok) throw new Error("stats");
      return (await res.json()) as { data: Stats };
    },
  });
  const stats = data?.data;

  useEffect(() => {
    landingHeroEntrance({
      mark: markRef.current,
      eyebrow: eyebrowRef.current,
      headline: null,
      support: supportRef.current,
      ctas: ctasRef.current,
      orbs: orbRefs.current.filter(Boolean) as HTMLElement[],
    });
    if (headlineRef.current) {
      const words = splitHeadlineWords(headlineRef.current);
      animateHeadlineWords(words);
    }
  }, []);

  useEffect(() => {
    if (!stats || !statsRef.current) return;
    const nums = statsRef.current.querySelectorAll<HTMLElement>("[data-count]");
    nums.forEach((el) => {
      const to = Number(el.dataset.count || 0);
      countUpOnScroll(el, to);
    });
  }, [stats]);

  useEffect(() => {
    const el = primaryCtaWrapRef.current;
    if (!el) return;
    const onDown = () => buttonPress(el);
    el.addEventListener("pointerdown", onDown);
    return () => el.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <section
      className="landing-hero mkt-hero"
      aria-labelledby="landing-headline"
    >
      <div className="landing-hero__grid" aria-hidden />
      <div className="landing-hero__glow" aria-hidden />
      <div
        ref={(el) => {
          orbRefs.current[0] = el;
        }}
        className="landing-orb landing-orb--1"
        aria-hidden
      />
      <div
        ref={(el) => {
          orbRefs.current[1] = el;
        }}
        className="landing-orb landing-orb--2"
        aria-hidden
      />

      <div className="mkt-hero__layout">
        <div className="mkt-hero__copy">
          <div ref={markRef} className="mkt-hero__brand">
            <MediCoreMark className="size-11" />
            <HeartbeatPulse className="h-7 w-36 text-primary" />
          </div>
          <p ref={eyebrowRef} className="landing-eyebrow">
            Clinical operations, patient-clear
          </p>
          <h1
            id="landing-headline"
            ref={headlineRef}
            className="landing-display mkt-hero__headline"
          >
            Care that moves as one system
          </h1>
          <p ref={supportRef} className="mkt-hero__support">
            {BRAND_TAGLINE} From first booking to discharge, every desk shares
            the same record — so your path stays clear.
          </p>
          <div ref={ctasRef} className="mkt-hero__ctas">
            <div ref={primaryCtaWrapRef} className="inline-flex">
              <Button asChild size="lg" className="mkt-hero__primary">
                <Link href={allowRegistration ? "/register" : "/login"}>
                  {allowRegistration ? "Get started — register" : "Sign in"}
                </Link>
              </Button>
            </div>
            <Button asChild size="lg" variant="outline">
              <Link href="#departments">Browse departments</Link>
            </Button>
          </div>

          <div ref={statsRef} className="mkt-hero__stats">
            <div>
              <p
                className="mkt-hero__stat-value"
                data-count={stats?.doctorCount ?? 0}
              >
                0
              </p>
              <p className="mkt-hero__stat-label">Doctors</p>
            </div>
            <div>
              <p
                className="mkt-hero__stat-value"
                data-count={stats?.departmentCount ?? 0}
              >
                0
              </p>
              <p className="mkt-hero__stat-label">Departments</p>
            </div>
            <div>
              <p className="mkt-hero__stat-value">24/7</p>
              <p className="mkt-hero__stat-label">Care desk</p>
            </div>
          </div>
        </div>

        <CareNetworkVisual
          className="mkt-hero__visual"
          doctorCount={stats?.doctorCount}
          departmentCount={stats?.departmentCount}
        />
      </div>
    </section>
  );
}
