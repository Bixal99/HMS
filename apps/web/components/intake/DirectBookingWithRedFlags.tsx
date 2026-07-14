"use client";

import { useState } from "react";
import Link from "next/link";
import { BookingFlow } from "@/components/appointments/BookingFlow";
import { RedFlagScreen } from "@/components/intake/RedFlagScreen";
import type { RedFlagKey } from "@/lib/redFlagSymptoms";
import { PageEnter } from "@/components/shared/PageEnter";
import { Button } from "@/components/ui/button";

type DirectBookingWithRedFlagsProps = {
  mode: "staff" | "patient";
};

type Step = "choose" | "redflags" | "book";

/** Patient booking: choose guided vs direct, then red-flag screen, then book. */
export function DirectBookingWithRedFlags({
  mode,
}: DirectBookingWithRedFlagsProps) {
  const [step, setStep] = useState<Step>(mode === "patient" ? "choose" : "book");
  const [redFlags, setRedFlags] = useState<RedFlagKey[]>([]);

  if (step === "choose") {
    return (
      <PageEnter>
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Book appointment</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              How would you like to start?
            </p>
          </div>
          <div className="grid gap-3">
            <Button asChild className="h-auto justify-start px-4 py-4 text-left">
              <Link href="/appointments/intake">
                <span className="block font-medium">Describe symptoms</span>
                <span className="mt-1 block text-xs font-normal opacity-90">
                  Guided path with department suggestion
                </span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start px-4 py-4 text-left"
              onClick={() => setStep("redflags")}
            >
              <span className="block font-medium">Book by doctor / specialty</span>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Pick a doctor and time directly
              </span>
            </Button>
          </div>
        </div>
      </PageEnter>
    );
  }

  if (step === "redflags") {
    return (
      <PageEnter>
        <RedFlagScreen
          onContinue={(keys) => {
            setRedFlags(keys);
            setStep("book");
          }}
        />
      </PageEnter>
    );
  }

  return <BookingFlow mode={mode} pendingRedFlags={redFlags} />;
}
