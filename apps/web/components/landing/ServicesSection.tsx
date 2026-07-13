"use client";

import { useEffect, useRef } from "react";
import {
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Pill,
  Stethoscope,
  BedDouble,
} from "lucide-react";
import { batchReveal } from "@/lib/marketing-motion";

const SERVICES = [
  {
    title: "Appointments",
    body: "Book by specialty and see live availability without calling the desk.",
    icon: CalendarDays,
  },
  {
    title: "Consultations",
    body: "Visit summaries, diagnoses, and plans stay attached to your record.",
    icon: Stethoscope,
  },
  {
    title: "Lab results",
    body: "Track ordered tests and critical flags from one patient timeline.",
    icon: FlaskConical,
  },
  {
    title: "Pharmacy",
    body: "Prescriptions move from doctor to dispense queue without paper handoffs.",
    icon: Pill,
  },
  {
    title: "Admissions",
    body: "Ward occupancy and bed transfers stay visible to your care team.",
    icon: BedDouble,
  },
  {
    title: "Billing clarity",
    body: "Invoices and payments surface in your portal when ready.",
    icon: ClipboardList,
  },
];

export function ServicesSection() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (rootRef.current) batchReveal("[data-reveal-item]", rootRef.current);
  }, []);

  return (
    <section id="services" ref={rootRef} className="landing-section">
      <div className="mx-auto">
        <p className="mkt-section-kicker">Services</p>
        <h2 className="landing-display mt-3">Care services in one system</h2>
        <p className="mkt-section-lead">
          From first booking to discharge, MediCore keeps clinical work and your
          patient portal on the same record.
        </p>
        <ol className="mkt-service-index">
          {SERVICES.map((s, i) => (
            <li key={s.title} data-reveal-item className="mkt-service-row">
              <span className="mkt-service-index__num" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                <s.icon className="size-4 text-primary" aria-hidden />
                <h3 className="mkt-service-index__title">{s.title}</h3>
              </div>
              <p className="mkt-service-index__body">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
