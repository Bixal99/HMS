"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ = [
  {
    q: "Do I need to visit reception before my first appointment?",
    a: "You can self-register online, then book. Reception can still help if you prefer in-person enrollment.",
  },
  {
    q: "Can I see lab results myself?",
    a: "Yes — finalized results appear in your patient portal once released by the lab team.",
  },
  {
    q: "Is my record shared outside the hospital?",
    a: "Access is role-based inside MediCore. External sharing only happens through your care team’s normal clinical processes.",
  },
  {
    q: "How do I contact the hospital?",
    a: "Use the contact form below, or sign in to message after you have an account.",
  },
];

export function FaqSection() {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="landing-section landing-section--muted">
      <div className="mx-auto max-w-3xl">
        <p className="mkt-section-kicker">FAQ</p>
        <h2 className="landing-display mt-3">Answers before you arrive</h2>
        <ul className="mkt-faq-list">
          {FAQ.map((item, i) => {
            const panelId = `${baseId}-panel-${i}`;
            const btnId = `${baseId}-btn-${i}`;
            const isOpen = open === i;
            return (
              <li key={item.q} className="mkt-faq-item">
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    {item.q}
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  hidden={!isOpen}
                >
                  {item.a}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
