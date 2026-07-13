"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";
import { initialsFromName } from "@/lib/avatar";

type Doctor = {
  id: string;
  specialization: string | null;
  designation: string;
  department: { name: string };
  user: { name: string | null };
};

export function DoctorsCarousel({
  allowRegistration = true,
}: {
  allowRegistration?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start" });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-doctors"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/public/doctors`);
      if (!res.ok) throw new Error("doctors");
      return (await res.json()) as { data: Doctor[] };
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
  const ctaHref = allowRegistration ? "/register" : "/login";

  return (
    <section id="doctors" className="landing-section landing-section--muted">
      <div className="mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mkt-section-kicker">Doctors</p>
            <h2 className="landing-display mt-3">Clinicians on your path</h2>
            <p className="mkt-section-lead">
              Meet clinicians available for outpatient booking.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Previous doctors"
              disabled={!canPrev}
              onClick={() => emblaApi?.scrollPrev()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Next doctors"
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
                    className="min-w-0 flex-[0_0_80%] animate-shimmer rounded-xl bg-muted sm:flex-[0_0_40%] lg:flex-[0_0_28%]"
                    style={{ height: 180 }}
                  />
                ))
              : items.map((d) => {
                  const name = d.user.name || d.designation;
                  return (
                    <article
                      key={d.id}
                      className="mkt-carousel-card min-w-0 flex-[0_0_80%] sm:flex-[0_0_40%] lg:flex-[0_0_28%]"
                    >
                      <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                        {initialsFromName(name)}
                      </div>
                      <h3 className="mt-3 font-semibold text-foreground">
                        {name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {d.designation}
                        {d.specialization ? ` · ${d.specialization}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.department.name}
                      </p>
                      <Button
                        asChild
                        size="sm"
                        className="mt-4"
                        variant="outline"
                      >
                        <Link href={ctaHref}>Book care</Link>
                      </Button>
                    </article>
                  );
                })}
          </div>
        </div>
      </div>
    </section>
  );
}
