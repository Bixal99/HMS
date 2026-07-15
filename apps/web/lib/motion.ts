import gsap from "gsap";

export const pageEnter = (el: HTMLElement) =>
  gsap.fromTo(
    el,
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
  );

export const staggerCards = (els: HTMLElement[] | NodeListOf<Element>) =>
  gsap.fromTo(
    els,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" },
  );

export const countUp = (el: HTMLElement, to: number) =>
  gsap.fromTo(
    el,
    { textContent: 0 },
    {
      textContent: to,
      duration: 0.8,
      ease: "power1.out",
      snap: { textContent: 1 },
    },
  );

export const slideStep = (
  outgoing: HTMLElement | null,
  incoming: HTMLElement,
  direction: "forward" | "back",
) => {
  const outX = direction === "forward" ? -24 : 24;
  const inX = direction === "forward" ? 24 : -24;
  const tl = gsap.timeline();
  if (outgoing) {
    tl.to(outgoing, { opacity: 0, x: outX, duration: 0.22, ease: "power2.in" }, 0);
  }
  tl.fromTo(
    incoming,
    { opacity: 0, x: inX },
    { opacity: 1, x: 0, duration: 0.28, ease: "power2.out" },
    outgoing ? 0.12 : 0,
  );
  return tl;
};

export const crossFade = (outgoing: HTMLElement | null, incoming: HTMLElement) => {
  const tl = gsap.timeline();
  if (outgoing) {
    tl.to(outgoing, { opacity: 0, duration: 0.2, ease: "power1.out" }, 0);
  }
  tl.fromTo(
    incoming,
    { opacity: 0 },
    { opacity: 1, duration: 0.2, ease: "power1.out" },
    0,
  );
  return tl;
};

export const moveActivePill = (
  pill: HTMLElement,
  target: HTMLElement,
  container: HTMLElement,
) => {
  const c = container.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  return gsap.to(pill, {
    x: t.left - c.left,
    y: t.top - c.top,
    width: t.width,
    height: t.height,
    duration: 0.35,
    ease: "power2.out",
  });
};

export const savedPulse = (el: HTMLElement) =>
  gsap.fromTo(
    el,
    { scale: 0.6, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.7)" },
  );

/** Brief confirmation flash — chip stays visible, then shows as booked. */
export const slotConfirmPulse = (el: HTMLElement) =>
  gsap
    .timeline()
    .to(el, {
      backgroundColor: "hsl(var(--primary) / 0.28)",
      borderColor: "hsl(var(--primary) / 0.7)",
      scale: 1.04,
      duration: 0.2,
      ease: "power2.out",
    })
    .to(el, {
      scale: 1,
      duration: 0.22,
      ease: "power2.inOut",
    });

/** Optimistic slot-chip removal (legacy; prefer slotConfirmPulse). */
export const optimisticRemove = (el: HTMLElement) =>
  gsap.to(el, {
    opacity: 0,
    scale: 0.85,
    duration: 0.2,
    ease: "power2.in",
  });

export const optimisticRestore = (el: HTMLElement) =>
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.85 },
    { opacity: 1, scale: 1, duration: 0.28, ease: "power2.out" },
  );

/** Brief fade for autosave “Saved · time” affordance. */
export const fadeSavedHint = (el: HTMLElement) =>
  gsap.fromTo(
    el,
    { opacity: 0, y: 4 },
    { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
  );

/**
 * Bed occupancy tile flip / color morph (Task 04 anticipation → Task 09).
 * Call when a bed tile's status class changes.
 */
export const bedStatusFlip = (el: HTMLElement) => {
  const tl = gsap.timeline();
  tl.to(el, {
    rotateY: 90,
    duration: 0.18,
    ease: "power2.in",
  }).fromTo(
    el,
    { rotateY: -90 },
    { rotateY: 0, duration: 0.22, ease: "power2.out" },
  );
  return tl;
};

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Landing hero load sequence: brand → headline → support → CTAs.
 * Skips motion when the user prefers reduced motion.
 */
export const heroEntrance = (parts: {
  brand: HTMLElement | null;
  headline: HTMLElement | null;
  support: HTMLElement | null;
  ctas: HTMLElement | null;
}) => {
  const nodes = [parts.brand, parts.headline, parts.support, parts.ctas].filter(
    (n): n is HTMLElement => Boolean(n),
  );
  if (!nodes.length) return null;

  if (prefersReducedMotion()) {
    gsap.set(nodes, { opacity: 1, y: 0 });
    return null;
  }

  gsap.set(nodes, { opacity: 0, y: 18 });
  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
  if (parts.brand) {
    tl.to(parts.brand, { opacity: 1, y: 0, duration: 0.45 }, 0);
  }
  if (parts.headline) {
    tl.to(parts.headline, { opacity: 1, y: 0, duration: 0.5 }, 0.12);
  }
  if (parts.support) {
    tl.to(parts.support, { opacity: 1, y: 0, duration: 0.45 }, 0.22);
  }
  if (parts.ctas) {
    tl.to(parts.ctas, { opacity: 1, y: 0, duration: 0.4 }, 0.34);
  }
  return tl;
};

/**
 * Reveal a section when it enters the viewport (IntersectionObserver + stagger).
 * Returns a cleanup function.
 */
export const observeScrollReveal = (
  section: HTMLElement,
  itemSelector = "[data-reveal-item]",
) => {
  const items = section.querySelectorAll<HTMLElement>(itemSelector);
  if (!items.length) return () => undefined;

  if (prefersReducedMotion()) {
    gsap.set(items, { opacity: 1, y: 0 });
    return () => undefined;
  }

  gsap.set(items, { opacity: 0, y: 16 });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        staggerCards(items);
        observer.disconnect();
        break;
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
  );

  observer.observe(section);
  return () => observer.disconnect();
};

export { gsap };
