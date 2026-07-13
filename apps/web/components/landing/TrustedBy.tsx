"use client";

const PARTNERS = [
  "City Care Network",
  "Northline Labs",
  "Harbor Pharmacy Co-op",
  "Summit Imaging",
  "Valley Health Alliance",
  "ClearPath Diagnostics",
];

/** Decorative trust marquee — SAMPLE partner names. */
export function TrustedBy() {
  const row = [...PARTNERS, ...PARTNERS];
  return (
    <section
      className="mkt-trust border-y border-[color:var(--landing-rule)] bg-[color:var(--landing-mist)]/70 py-7"
      aria-label="Trusted by partner networks"
    >
      <p className="mkt-section-kicker mb-4 text-center">
        Trusted across regional care partners
      </p>
      <div className="mkt-marquee" aria-hidden>
        <div className="mkt-marquee__track">
          {row.map((name, i) => (
            <span key={`${name}-${i}`} className="mkt-marquee__item">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
