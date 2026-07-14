"use client";

import { useState } from "react";
import {
  RED_FLAG_SYMPTOMS,
  type RedFlagKey,
} from "@/lib/redFlagSymptoms";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type RedFlagScreenProps = {
  onContinue: (selected: RedFlagKey[]) => void;
};

/**
 * Safety screen. Red flags open a calm full-page Emergency Guidance
 * (not a destructive red modal).
 */
export function RedFlagScreen({ onContinue }: RedFlagScreenProps) {
  const [selected, setSelected] = useState<Set<RedFlagKey>>(new Set());
  const [showGuidance, setShowGuidance] = useState(false);

  function toggle(key: RedFlagKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleContinue() {
    if (selected.size > 0) {
      setShowGuidance(true);
      return;
    }
    onContinue([]);
  }

  if (showGuidance) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Safety notice
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Your symptoms may require urgent medical attention
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Based on the information you provided, your symptoms could indicate a
            condition that should be assessed promptly.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            If you are experiencing severe chest pain, difficulty breathing, heavy
            bleeding, loss of consciousness, or another life-threatening emergency,
            go to the nearest Emergency Department or call your local emergency
            services immediately.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            If you still wish to request an appointment, we will mark it as Urgent
            so our staff can review it as quickly as possible.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <a href="tel:112">Find emergency care</a>
            </Button>
            <Button
              type="button"
              onClick={() => onContinue(Array.from(selected))}
            >
              Continue with urgent appointment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Before we continue
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you currently experiencing any of the following?
        </p>
      </div>

      <ul className="space-y-3">
        {RED_FLAG_SYMPTOMS.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer gap-3 rounded-md border border-border bg-card px-3 py-3 text-sm hover:bg-accent/40">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={selected.has(item.key)}
                onChange={() => toggle(item.key)}
              />
              <span className="text-foreground">{item.label}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <Button type="button" onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}

/** Compact label list for staff views */
export function RedFlagLabels({ keys }: { keys: string[] }) {
  if (!keys.length) return null;
  const labels = RED_FLAG_SYMPTOMS.filter((s) =>
    keys.includes(s.key),
  ).map((s) => s.label);
  if (!labels.length) return null;
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"
    >
      <p className="font-semibold">Reported urgent symptoms</p>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {labels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <Label className="sr-only">Patient-reported emergency indicators</Label>
    </div>
  );
}
