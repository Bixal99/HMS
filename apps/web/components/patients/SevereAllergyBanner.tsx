"use client";

import { Button } from "@/components/ui/button";

type Allergy = {
  id: string;
  allergen: string;
  notes?: string | null;
};

type SevereAllergyBannerProps = {
  allergies: Allergy[];
  acknowledged: boolean;
  onAcknowledge: () => void;
};

/** Shared severe-allergy alert (Task 03 pattern) — keep markup in sync for consultation + profile. */
export function SevereAllergyBanner({
  allergies,
  acknowledged,
  onAcknowledge,
}: SevereAllergyBannerProps) {
  if (allergies.length === 0 || acknowledged) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive"
    >
      <p className="font-semibold">Severe allergy alert</p>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {allergies.map((a) => (
          <li key={a.id}>
            {a.allergen}
            {a.notes ? ` — ${a.notes}` : ""}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">
        Review clinically before proceeding. Color is not the only cue — this alert is labeled and
        uses role=&quot;alert&quot;.
      </p>
      <Button type="button" className="mt-3" variant="destructive" onClick={onAcknowledge}>
        Acknowledge
      </Button>
    </div>
  );
}
