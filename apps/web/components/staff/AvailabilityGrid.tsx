"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { savedPulse } from "@/lib/motion";
import { PageEnter } from "@/components/shared/PageEnter";
import { Button } from "@/components/ui/button";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function cellKey(day: number, hour: number) {
  return `${day}-${hour}`;
}

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

type Block = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
};

function blocksToSet(blocks: Block[]) {
  const set = new Set<string>();
  for (const b of blocks) {
    const start = Number(b.startTime.slice(0, 2));
    const end = Number(b.endTime.slice(0, 2));
    for (let h = start; h < end; h++) {
      set.add(cellKey(b.dayOfWeek, h));
    }
  }
  return set;
}

function setToBlocks(set: Set<string>): Block[] {
  const blocks: Block[] = [];
  for (let day = 0; day < 7; day++) {
    let start: number | null = null;
    for (let h = 0; h <= 24; h++) {
      const on = h < 24 && set.has(cellKey(day, h));
      if (on && start === null) start = h;
      if (!on && start !== null) {
        blocks.push({
          dayOfWeek: day,
          startTime: hourLabel(start),
          endTime: hourLabel(h),
          slotDurationMins: 15,
        });
        start = null;
      }
    }
  }
  return blocks;
}

export function AvailabilityGrid() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState({ day: 1, hour: 9 });
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"paint" | "erase">("paint");
  const savedRef = useRef<HTMLSpanElement>(null);

  const { data: me } = useQuery({
    queryKey: ["staff-me"],
    queryFn: () => apiFetch<{ id: string }>("/api/staff/me"),
  });

  const { data } = useQuery({
    queryKey: ["availability", me?.id],
    enabled: Boolean(me?.id),
    queryFn: () =>
      apiFetch<{ data: Block[] }>(`/api/staff/${me!.id}/availability`),
  });

  useEffect(() => {
    if (data?.data) setSelected(blocksToSet(data.data));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (blocks: Block[]) =>
      apiFetch(`/api/staff/${me!.id}/availability`, {
        method: "PUT",
        body: JSON.stringify({ blocks }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability", me?.id] });
      if (savedRef.current) savedPulse(savedRef.current);
      toast.success("Availability saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleCell = (day: number, hour: number, mode?: "paint" | "erase") => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = cellKey(day, hour);
      const shouldOn = mode ? mode === "paint" : !next.has(key);
      if (shouldOn) next.add(key);
      else next.delete(key);
      setAnnouncement(
        `${DAYS[day]} ${hourLabel(hour)} marked ${shouldOn ? "available" : "unavailable"}`,
      );
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    let { day, hour } = focus;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      day = (day + 1) % 7;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      day = (day + 6) % 7;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      hour = Math.min(23, hour + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      hour = Math.max(0, hour - 1);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleCell(day, hour);
      return;
    } else {
      return;
    }
    setFocus({ day, hour });
  };

  const leaveForm = useMemo(
    () => (
      <form
        className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!me?.id) return;
          const fd = new FormData(e.currentTarget);
          apiFetch(`/api/staff/${me.id}/leave-requests`, {
            method: "POST",
            body: JSON.stringify({
              startDate: fd.get("startDate"),
              endDate: fd.get("endDate"),
              reason: fd.get("reason"),
            }),
          })
            .then(() => {
              toast.success("Leave request submitted");
              e.currentTarget.reset();
            })
            .catch((err: Error) => toast.error(err.message));
        }}
      >
        <input
          name="startDate"
          type="date"
          required
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Leave start"
        />
        <input
          name="endDate"
          type="date"
          required
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Leave end"
        />
        <input
          name="reason"
          required
          placeholder="Reason"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-1"
        />
        <Button type="submit">Request leave</Button>
      </form>
    ),
    [me?.id],
  );

  return (
    <PageEnter className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Weekly availability</h1>
          <p className="text-sm text-muted-foreground">
            Paint hours with mouse drag, or use arrow keys + Space
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span ref={savedRef} className="text-sm text-success opacity-0" aria-hidden>
            ✓ Saved
          </span>
          <Button
            type="button"
            disabled={!me?.id || saveMutation.isPending}
            onClick={() => saveMutation.mutate(setToBlocks(selected))}
          >
            Save schedule
          </Button>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <div
        role="grid"
        aria-label="Weekly availability"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="overflow-auto rounded-lg border border-border"
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <div
          className="grid min-w-[640px]"
          style={{ gridTemplateColumns: `3.5rem repeat(7, minmax(0, 1fr))` }}
        >
          <div className="sticky left-0 bg-muted p-2 text-xs text-muted-foreground" />
          {DAYS.map((d) => (
            <div
              key={d}
              className="border-l border-border bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}

          {HOURS.map((hour) => (
            <div key={`row-${hour}`} className="contents">
              <div className="sticky left-0 border-t border-border bg-background p-1 text-[10px] text-muted-foreground">
                {hourLabel(hour)}
              </div>
              {DAYS.map((_, day) => {
                const on = selected.has(cellKey(day, hour));
                const focused = focus.day === day && focus.hour === hour;
                return (
                  <button
                    key={cellKey(day, hour)}
                    type="button"
                    role="gridcell"
                    aria-selected={on}
                    aria-label={`${DAYS[day]} ${hourLabel(hour)}`}
                    className={`border-l border-t border-border p-2 text-[10px] transition-colors ${
                      on ? "bg-success/25 text-foreground" : "bg-background hover:bg-muted/60"
                    } ${focused ? "ring-2 ring-ring ring-inset" : ""}`}
                    onMouseDown={() => {
                      const mode = on ? "erase" : "paint";
                      setDragMode(mode);
                      setDragging(true);
                      toggleCell(day, hour, mode);
                      setFocus({ day, hour });
                    }}
                    onMouseEnter={() => {
                      if (dragging) toggleCell(day, hour, dragMode);
                    }}
                    onFocus={() => setFocus({ day, hour })}
                  >
                    {on ? "•" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Request leave</h2>
        {leaveForm}
      </div>
    </PageEnter>
  );
}
