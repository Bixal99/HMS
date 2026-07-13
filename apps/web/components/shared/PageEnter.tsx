"use client";

import { useEffect, useRef } from "react";
import { pageEnter } from "@/lib/motion";

export function PageEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) pageEnter(ref.current);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
