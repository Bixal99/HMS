"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck, HeartPulse, Link2 } from "lucide-react";
import { batchReveal } from "@/lib/marketing-motion";

export function WhyUsSection() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (rootRef.current) batchReveal("[data-reveal-item]", rootRef.current);
  }, []);

  return (
    <section
      id="why"
      ref={rootRef}
      className="landing-section landing-section--muted"
    >
      <div className="mx-auto">
        <p className="mkt-section-kicker">Why MediCore</p>
        <h2 className="landing-display mt-3">Built for real clinic rhythm</h2>
        <p className="mkt-section-lead">
          Not a brochure stack of widgets — role-aware tools that match how
          wards, labs, and reception already work.
        </p>
        <div className="mkt-proof">
          <article data-reveal-item className="mkt-proof-card mkt-proof__main">
            <HeartPulse className="size-6 text-primary" aria-hidden />
            <h3>One patient identity</h3>
            <p>
              Appointments, encounters, labs, and invoices hang off the same
              MRN — so you never re-explain your history at every desk.
            </p>
          </article>
          <article data-reveal-item className="mkt-proof-card">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            <h3>Role-aware access</h3>
            <p>
              Clinicians see charts; you see your portal. Same system, right
              depth.
            </p>
          </article>
          <article data-reveal-item className="mkt-proof-card">
            <Link2 className="size-5 text-primary" aria-hidden />
            <h3>Live operations</h3>
            <p>
              Queues, beds, and pharmacy boards update without a page refresh.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
