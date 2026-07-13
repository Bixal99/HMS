import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { countUp, prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function countUpOnScroll(el: HTMLElement, to: number) {
  if (prefersReducedMotion()) {
    el.textContent = String(Math.round(to));
    return;
  }

  gsap.set(el, { textContent: 0 });
  ScrollTrigger.create({
    trigger: el,
    start: "top 85%",
    once: true,
    onEnter: () => countUp(el, to),
  });
}

/** Word split for headlines when Club SplitText is unavailable. */
export function splitHeadlineWords(el: HTMLElement) {
  const text = el.textContent?.trim() ?? "";
  if (!text) return [] as HTMLElement[];

  if (prefersReducedMotion()) {
    el.style.opacity = "1";
    return [] as HTMLElement[];
  }

  const words = text.split(/\s+/);
  el.setAttribute("aria-label", text);
  el.innerHTML = words
    .map(
      (w) =>
        `<span class="mkt-word" style="display:inline-block;opacity:0;transform:translateY(1.1em)">${w}</span>`,
    )
    .join(" ");
  return Array.from(el.querySelectorAll<HTMLElement>(".mkt-word"));
}

export function animateHeadlineWords(words: HTMLElement[]) {
  if (!words.length || prefersReducedMotion()) {
    words.forEach((w) => {
      w.style.opacity = "1";
      w.style.transform = "none";
    });
    return null;
  }
  return gsap.to(words, {
    opacity: 1,
    y: 0,
    duration: 0.55,
    stagger: 0.045,
    ease: "power3.out",
  });
}

export function batchReveal(selector: string, root?: Element | Document) {
  const scope = root ?? document;
  const els = Array.from(scope.querySelectorAll<HTMLElement>(selector));
  if (!els.length) return;

  if (prefersReducedMotion()) {
    gsap.set(els, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(els, { opacity: 0, y: 24 });
  ScrollTrigger.batch(els, {
    start: "top 88%",
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        overwrite: true,
      });
    },
  });
}
