"use client";

import { cn } from "@/lib/utils";

type BoardSkeletonProps = {
  columns?: number;
  cardsPerColumn?: number;
  label?: string;
  className?: string;
};

/** Kanban-style loading placeholder for surgery / lab / pharmacy / radiology boards. */
export function BoardSkeleton({
  columns = 4,
  cardsPerColumn = 3,
  label = "Loading board…",
  className,
}: BoardSkeletonProps) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        {label}
      </p>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: columns }).map((_, col) => (
          <div
            key={col}
            className="space-y-2 rounded-lg border border-border bg-muted/20 p-3"
          >
            <div className="h-4 w-24 animate-shimmer rounded bg-muted" />
            {Array.from({ length: cardsPerColumn }).map((_, row) => (
              <div
                key={row}
                className="h-20 animate-shimmer rounded-md bg-muted"
                style={{ animationDelay: `${(col * cardsPerColumn + row) * 60}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
