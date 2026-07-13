import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export type LandingHeroParts = {
  mark: HTMLElement | null;
  eyebrow: HTMLElement | null;
  headline: HTMLElement | null;
  support: HTMLElement | null;
  ctas: HTMLElement | null;
  orbs?: HTMLElement[];
};

/**
 * Hero entrance: mark → eyebrow → headline → support → CTAs.
 * Optional ambient orb float when motion is allowed.
 */
export function landingHeroEntrance(parts: LandingHeroParts) {
  const nodes = [
    parts.mark,
    parts.eyebrow,
    parts.headline,
    parts.support,
    parts.ctas,
  ].filter((n): n is HTMLElement => Boolean(n));

  if (!nodes.length) return null;

  if (prefersReducedMotion()) {
    gsap.set(nodes, { autoAlpha: 1, y: 0, scale: 1 });
    return null;
  }

  gsap.set(nodes, { autoAlpha: 0, y: 22 });
  if (parts.mark) gsap.set(parts.mark, { scale: 0.85 });

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  if (parts.mark) {
    tl.to(parts.mark, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55 }, 0);
  }
  if (parts.eyebrow) {
    tl.to(parts.eyebrow, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.12);
  }
  if (parts.headline) {
    tl.to(parts.headline, { autoAlpha: 1, y: 0, duration: 0.55 }, 0.2);
  }
  if (parts.support) {
    tl.to(parts.support, { autoAlpha: 1, y: 0, duration: 0.45 }, 0.32);
  }
  if (parts.ctas) {
    tl.fromTo(
      parts.ctas,
      { autoAlpha: 0, y: 16, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.4)" },
      0.42,
    );
  }

  if (parts.orbs?.length) {
    parts.orbs.forEach((orb, i) => {
      gsap.to(orb, {
        y: i % 2 === 0 ? -18 : 14,
        x: i % 2 === 0 ? 10 : -8,
        duration: 4 + i * 0.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    });
  }

  return tl;
}

/**
 * Scroll-triggered stagger reveal for items inside a section.
 * Returns cleanup.
 */
export function landingScrollReveal(
  section: HTMLElement,
  itemSelector = "[data-reveal-item]",
) {
  const items = section.querySelectorAll<HTMLElement>(itemSelector);
  if (!items.length) return () => undefined;

  if (prefersReducedMotion()) {
    gsap.set(items, { autoAlpha: 1, y: 0 });
    return () => undefined;
  }

  gsap.set(items, { autoAlpha: 0, y: 28 });

  const tween = gsap.to(items, {
    autoAlpha: 1,
    y: 0,
    duration: 0.55,
    stagger: 0.08,
    ease: "power2.out",
    scrollTrigger: {
      trigger: section,
      start: "top 78%",
      once: true,
    },
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}

/**
 * Card hover lift + icon well rotation. Call from contextSafe handlers.
 */
export function featureCardHoverIn(
  card: HTMLElement,
  iconWell: HTMLElement | null,
) {
  if (prefersReducedMotion()) return;
  gsap.to(card, {
    y: -8,
    scale: 1.02,
    duration: 0.35,
    ease: "power2.out",
    overwrite: "auto",
  });
  if (iconWell) {
    gsap.to(iconWell, {
      rotation: 6,
      scale: 1.06,
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
    });
  }
  card.style.setProperty("--card-glow", "0.35");
}

export function featureCardHoverOut(
  card: HTMLElement,
  iconWell: HTMLElement | null,
) {
  if (prefersReducedMotion()) return;
  gsap.to(card, {
    y: 0,
    scale: 1,
    duration: 0.4,
    ease: "power2.out",
    overwrite: "auto",
  });
  if (iconWell) {
    gsap.to(iconWell, {
      rotation: 0,
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
    });
  }
  card.style.setProperty("--card-glow", "0");
}

/**
 * Light 3D tilt based on pointer position within the card.
 */
export function featureCardTilt(
  card: HTMLElement,
  clientX: number,
  clientY: number,
) {
  if (prefersReducedMotion()) return;
  const rect = card.getBoundingClientRect();
  const px = (clientX - rect.left) / rect.width - 0.5;
  const py = (clientY - rect.top) / rect.height - 0.5;
  gsap.to(card, {
    rotateY: px * 8,
    rotateX: -py * 8,
    duration: 0.35,
    ease: "power2.out",
    overwrite: "auto",
    transformPerspective: 800,
  });
}

export function featureCardTiltReset(card: HTMLElement) {
  if (prefersReducedMotion()) return;
  gsap.to(card, {
    rotateY: 0,
    rotateX: 0,
    duration: 0.45,
    ease: "power2.out",
    overwrite: "auto",
  });
}

/**
 * Care-network hero graphic: ECG stroke draw + staggered node activation.
 * Returns cleanup. Respects prefers-reduced-motion.
 */
export function animateCareNetwork(root: HTMLElement) {
  const ecg = root.querySelector<SVGPathElement>("[data-care-ecg]");
  const nodes = Array.from(
    root.querySelectorAll<SVGGElement>("[data-care-node]"),
  );

  if (prefersReducedMotion()) {
    if (ecg) {
      ecg.style.strokeDasharray = "none";
      ecg.style.strokeDashoffset = "0";
    }
    gsap.set(nodes, { autoAlpha: 1, scale: 1 });
    return () => undefined;
  }

  const ctx = gsap.context(() => {
    if (ecg) {
      const length = ecg.getTotalLength();
      gsap.set(ecg, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });
    }

    gsap.set(nodes, { autoAlpha: 0, scale: 0.7, transformOrigin: "50% 50%" });

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    if (ecg) {
      tl.to(ecg, { strokeDashoffset: 0, duration: 1.35 }, 0.15);
    }

    tl.to(
      nodes,
      {
        autoAlpha: 1,
        scale: 1,
        duration: 0.45,
        stagger: 0.1,
        ease: "back.out(1.6)",
      },
      0.55,
    );

    nodes.forEach((node, i) => {
      gsap.to(node, {
        y: i % 2 === 0 ? -5 : 4,
        duration: 2.4 + i * 0.25,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.4 + i * 0.12,
      });
    });
  }, root);

  return () => ctx.revert();
}

export { gsap, ScrollTrigger };
