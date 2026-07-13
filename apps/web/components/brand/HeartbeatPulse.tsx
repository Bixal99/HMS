"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Hero ECG stroke — currentColor only. */
export function HeartbeatPulse({ className }: { className?: string }) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || prefersReducedMotion()) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 1.6s ease-out";
    path.style.strokeDashoffset = "0";
  }, []);

  return (
    <svg
      viewBox="0 0 240 64"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        ref={pathRef}
        d="M4 32h42l10-18 14 36 16-48 18 40 12-10H236"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
