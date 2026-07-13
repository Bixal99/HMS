"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/* SAMPLE ONLY — fictional testimonials for marketing demos. */
const QUOTES = [
  {
    quote:
      "I booked my follow-up from home and saw the same doctor without re-registering at the desk.",
    name: "Amina R.",
    role: "Outpatient",
  },
  {
    quote:
      "Lab results showed up in my portal the same afternoon — no phone tag with reception.",
    name: "Daniel K.",
    role: "Patient",
  },
  {
    quote:
      "Pharmacy pickup was ready when I arrived. The queue status matched what the nurse told me.",
    name: "Sofia M.",
    role: "Caregiver",
  },
];

export function TestimonialsSection() {
  const [mounted, setMounted] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

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
    return () => {
      cancelAnimationFrame(frame);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="landing-section">
      <div className="mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mkt-section-kicker">Patient voices</p>
            <h2 className="landing-display mt-3">What patients notice</h2>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Previous testimonial"
              disabled={!canPrev}
              onClick={() => emblaApi?.scrollPrev()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Next testimonial"
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
          <div className="flex">
            {QUOTES.map((q) => (
              <blockquote
                key={q.name}
                className="mkt-quote min-w-0 flex-[0_0_100%] md:flex-[0_0_80%] lg:flex-[0_0_60%]"
              >
                <p>“{q.quote}”</p>
                <footer className="mt-5 text-sm text-muted-foreground">
                  <cite className="not-italic font-medium text-foreground">
                    {q.name}
                  </cite>
                  {" · "}
                  {q.role}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
