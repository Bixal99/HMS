"use client";

import { cn } from "@/lib/utils";

type ListSkeletonProps = {
  rows?: number;
  dense?: boolean;
  label?: string;
  className?: string;
};

/** Animated list placeholders — preferred over bare "Loading…" text. */
export function ListSkeleton({
  rows = 4,
  dense = false,
  label,
  className,
}: ListSkeletonProps) {
  const height = dense ? "h-10" : "h-14";
  return (
    <div
      className={cn("space-y-2", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {label ? (
        <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden
          />
          {label}
        </p>
      ) : null}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-shimmer rounded-lg bg-muted",
            height,
            "opacity-90",
          )}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
