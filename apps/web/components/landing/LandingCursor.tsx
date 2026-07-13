"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Desktop custom cursor: small dot + lagging ring.
 * Disabled on touch / reduced motion / no hover capability.
 */
export function LandingCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const root = document.documentElement;
    root.classList.add("landing-cursor-active");

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const xTo = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
    const yTo = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
    const rxTo = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    const ryTo = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    const onMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      rxTo(e.clientX);
      ryTo(e.clientY);
    };

    const setPointer = (on: boolean) => {
      root.classList.toggle("landing-cursor-pointer", on);
      gsap.to(ring, {
        scale: on ? 1.65 : 1,
        duration: 0.25,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(dot, {
        scale: on ? 0.55 : 1,
        duration: 0.25,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (
        t.closest("a, button, [data-cursor='pointer'], [role='button']")
      ) {
        setPointer(true);
      }
    };

    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (
        related?.closest("a, button, [data-cursor='pointer'], [role='button']")
      ) {
        return;
      }
      setPointer(false);
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      root.classList.remove("landing-cursor-active", "landing-cursor-pointer");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  return (
    <div className="landing-cursor" aria-hidden>
      <div ref={ringRef} className="landing-cursor__ring" />
      <div ref={dotRef} className="landing-cursor__dot" />
    </div>
  );
}
