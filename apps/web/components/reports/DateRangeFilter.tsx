"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function defaultRange() {
  const end = new Date();
  const start = subDays(end, 29);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export function useReportDateRange() {
  const searchParams = useSearchParams();
  const defaults = defaultRange();
  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;
  return { start, end };
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { start, end } = useReportDateRange();

  const update = useCallback(
    (key: "start" | "end", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      if (!params.get("start")) params.set("start", start);
      if (!params.get("end")) params.set("end", end);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, start, end],
  );

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-end gap-3 border-b border-border bg-background/95 px-1 py-3 backdrop-blur">
      <div className="space-y-1">
        <Label htmlFor="report-start">Start</Label>
        <Input
          id="report-start"
          type="date"
          value={start}
          onChange={(e) => update("start", e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="report-end">End</Label>
        <Input
          id="report-end"
          type="date"
          value={end}
          onChange={(e) => update("end", e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
