"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";

type Dept = { id: string; name: string; description: string | null };

export function DepartmentsCarousel() {
  const [mounted, setMounted] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-departments"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/public/departments`);
      if (!res.ok) throw new Error("departments");
      return (await res.json()) as { data: Dept[] };
    },
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const frame = requestAnimationFrame(() => onSelect());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      cancelAnimationFrame(frame);
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const items = data?.data ?? [];

  return (
    <section id="departments" className="landing-section">
      <div className="mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mkt-section-kicker">Departments</p>
            <h2 className="landing-display mt-3">Specialties ready to book</h2>
            <p className="mkt-section-lead">
              Explore specialties available for outpatient booking.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Previous departments"
              disabled={!canPrev}
              onClick={() => emblaApi?.scrollPrev()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Next departments"
              disabled={!canNext}
              onClick={() => emblaApi?.scrollNext()}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div
          className="mt-8 overflow-hidden"
          ref={mounted ? emblaRef : undefined}
          suppressHydrationWarning
        >
          <div className="flex gap-4">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-w-0 flex-[0_0_85%] animate-shimmer rounded-xl bg-muted sm:flex-[0_0_45%] lg:flex-[0_0_30%]"
                    style={{ height: 140 }}
                  />
                ))
              : items.map((d, i) => (
                  <article
                    key={d.id}
                    className="mkt-carousel-card min-w-0 flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_30%]"
                  >
                    <p className="mkt-service-index__num" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 font-semibold text-foreground">
                      {d.name}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {d.description || "Specialty care within MediCore."}
                    </p>
                  </article>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}
