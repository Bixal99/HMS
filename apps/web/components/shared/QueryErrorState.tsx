"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toUserFacingError } from "@/lib/api";
import { cn } from "@/lib/utils";

type QueryErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
};

/**
 * Friendly query failure UI — never shows raw browser "Failed to fetch".
 */
export function QueryErrorState({
  error,
  onRetry,
  title = "Couldn’t load this data",
  className,
}: QueryErrorStateProps) {
  const description = toUserFacingError(error);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="size-10 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
