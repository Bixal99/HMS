"use client";

import { useEffect, useRef } from "react";
import { countUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

type KpiTileProps = {
  label: string;
  value: number | null;
  format?: (n: number) => string;
  suffix?: string;
  className?: string;
};

export function KpiTile({
  label,
  value,
  format,
  suffix,
  className,
}: KpiTileProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const display =
    value == null
      ? "—"
      : format
        ? format(value)
        : `${Math.round(value)}${suffix ?? ""}`;

  useEffect(() => {
    if (value == null || !ref.current || format) return;
    countUp(ref.current, Math.round(value));
  }, [value, format]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-4 py-3",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {format || value == null ? (
          display
        ) : (
          <>
            <span ref={ref}>0</span>
            {suffix}
          </>
        )}
      </p>
    </div>
  );
}
