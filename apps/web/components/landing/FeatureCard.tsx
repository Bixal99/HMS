"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  featureCardHoverIn,
  featureCardHoverOut,
  featureCardTilt,
  featureCardTiltReset,
} from "@/lib/landing-motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  accent?: string;
  className?: string;
};

export function FeatureCard({
  icon,
  title,
  description,
  accent = "hsl(217 91% 45%)",
  className,
}: FeatureCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const card = cardRef.current;
      if (!card || !contextSafe) return;

      const enter = contextSafe(() => {
        featureCardHoverIn(card, iconRef.current);
      });
      const leave = contextSafe(() => {
        featureCardHoverOut(card, iconRef.current);
        featureCardTiltReset(card);
      });
      const move = contextSafe((e: MouseEvent) => {
        featureCardTilt(card, e.clientX, e.clientY);
      });

      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);
      card.addEventListener("mousemove", move);

      return () => {
        card.removeEventListener("mouseenter", enter);
        card.removeEventListener("mouseleave", leave);
        card.removeEventListener("mousemove", move);
      };
    },
    { scope: cardRef },
  );

  return (
    <article
      ref={cardRef}
      data-reveal-item
      data-cursor="pointer"
      className={cn("landing-feature-card", className)}
      style={
        {
          "--card-accent": accent,
          "--card-glow": "0",
        } as CSSProperties
      }
    >
      <div ref={iconRef} className="landing-feature-card__icon" aria-hidden>
        {icon}
      </div>
      <h3 className="landing-feature-card__title">{title}</h3>
      <p className="landing-feature-card__body">{description}</p>
    </article>
  );
}
