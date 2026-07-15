"use client";

import { cn } from "@/lib/utils";

type InlineLoaderProps = {
  label?: string;
  className?: string;
};

/** Compact spinner + label for settings, drawers, and Suspense fallbacks. */
export function InlineLoader({
  label = "Loading…",
  className,
}: InlineLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
