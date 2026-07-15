"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

/**
 * Show loading as soon as the user has typed enough characters and the
 * query is still catching up (debounce) or the network request is in flight.
 */
export function isTypeaheadBusy(
  query: string,
  opts: {
    debounced?: string;
    isFetching?: boolean;
    isLoading?: boolean;
    minChars?: number;
  },
): boolean {
  const min = opts.minChars ?? 1;
  const q = query.trim();
  if (q.length < min) return false;
  if (opts.debounced !== undefined && opts.debounced.trim() !== q) return true;
  return Boolean(opts.isFetching || opts.isLoading);
}

type SearchInputProps = React.ComponentProps<typeof Input> & {
  /** When true and the field has text, show an inline spinner. */
  isSearching?: boolean;
};

/** Text input with an inline spinner on the right while searching. */
export function SearchInput({
  isSearching,
  className,
  ...props
}: SearchInputProps) {
  const hasQuery = String(props.value ?? "").trim().length > 0;
  const showSpinner = Boolean(isSearching && hasQuery);

  return (
    <div className="relative w-full">
      <Input
        {...props}
        className={cn(showSpinner && "pr-9", className)}
        aria-busy={showSpinner || undefined}
      />
      {showSpinner ? (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          role="status"
          aria-label="Searching"
        >
          <SearchSpinner />
        </span>
      ) : null}
    </div>
  );
}
