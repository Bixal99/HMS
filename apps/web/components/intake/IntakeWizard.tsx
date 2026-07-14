"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  Bone,
  Brain,
  HeartPulse,
  HelpCircle,
  Stethoscope,
  Thermometer,
  Venus,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { staggerCards } from "@/lib/motion";
import type { RedFlagKey } from "@/lib/redFlagSymptoms";
import { BookingFlow } from "@/components/appointments/BookingFlow";
import { RedFlagScreen } from "@/components/intake/RedFlagScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageEnter } from "@/components/shared/PageEnter";
import { cn } from "@/lib/utils";

type SymptomCategory = {
  id: string;
  name: string;
  description: string | null;
  suggestedDepartmentId: string;
  suggestedDepartment: { id: string; name: string };
};

type Department = {
  id: string;
  name: string;
};

type CreatedIntake = {
  id: string;
  chiefComplaintText: string;
};

const CATEGORY_ICONS = [
  HelpCircle,
  HeartPulse,
  Thermometer,
  Activity,
  Stethoscope,
  Bone,
  Brain,
  Venus,
] as const;

type Step = "redflags" | "details" | "department" | "booking";

export function IntakeWizard() {
  const [step, setStep] = useState<Step>("redflags");
  const [redFlags, setRedFlags] = useState<RedFlagKey[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks" | "months">(
    "days",
  );
  const [severity, setSeverity] = useState<"MILD" | "MODERATE" | "SEVERE">(
    "MILD",
  );
  const [departmentId, setDepartmentId] = useState("");
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ["symptom-categories"],
    queryFn: () =>
      apiFetch<{ data: SymptomCategory[] }>("/api/symptom-categories"),
  });

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<{ data: Department[] }>("/api/departments"),
  });

  const { data: recommendData } = useQuery({
    queryKey: ["intake-recommend", categoryId],
    enabled: step === "department" && Boolean(categoryId),
    queryFn: () =>
      apiFetch<{
        data: {
          suggestedDepartment: { id: string; name: string };
          confidence: number;
          fallbackUsed: boolean;
          fallbackReason: string | null;
          doctors: Array<{
            id: string;
            name: string;
            nextSlotAt: string | null;
          }>;
        };
      }>(`/api/symptom-categories/recommend?symptomCategoryId=${categoryId}`),
  });

  const categories = categoriesData?.data ?? [];
  const departments = deptsData?.data ?? [];
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const recommendation = recommendData?.data;

  useEffect(() => {
    if (step !== "details" || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll("[data-category-card]");
    if (cards.length) staggerCards(cards);
  }, [step, categories.length]);

  useEffect(() => {
    if (recommendation?.suggestedDepartment.id) {
      setDepartmentId(recommendation.suggestedDepartment.id);
    } else if (selectedCategory && !departmentId) {
      setDepartmentId(selectedCategory.suggestedDepartmentId);
    }
  }, [selectedCategory, departmentId, recommendation]);

  const createIntake = useMutation({
    mutationFn: () =>
      apiFetch<{ data: CreatedIntake }>("/api/patient-intake", {
        method: "POST",
        body: JSON.stringify({
          symptomCategoryId: categoryId,
          chiefComplaintText: chiefComplaint.trim(),
          durationValue,
          durationUnit,
          severity,
          redFlagsSelected: redFlags,
        }),
      }),
    onSuccess: (res) => {
      setIntakeId(res.data.id);
      setStep("booking");
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not save intake",
      );
    },
  });

  function goToDepartment() {
    if (!categoryId) {
      toast.error("Please choose a symptom category");
      return;
    }
    if (chiefComplaint.trim().length < 10) {
      toast.error("Please describe your concern in at least 10 characters");
      return;
    }
    if (selectedCategory) {
      setDepartmentId(selectedCategory.suggestedDepartmentId);
    }
    setStep("department");
  }

  function confirmDepartment() {
    if (!departmentId) {
      toast.error("Please choose a department");
      return;
    }
    createIntake.mutate();
  }

  if (step === "booking" && intakeId) {
    return (
      <PageEnter>
        <BookingFlow
          mode="patient"
          departmentId={departmentId}
          initialReason={chiefComplaint.trim()}
          intakeId={intakeId}
        />
      </PageEnter>
    );
  }

  return (
    <PageEnter>
      {step === "redflags" ? (
        <RedFlagScreen
          onContinue={(keys) => {
            setRedFlags(keys);
            setStep("details");
          }}
        />
      ) : null}

      {step === "details" ? (
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              What&apos;s going on?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a category and describe your concern in your own words. This
              helps route you — it is not a diagnosis.
            </p>
          </div>

          <div
            ref={gridRef}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {categories.map((cat, i) => {
              const Icon = CATEGORY_ICONS[i % CATEGORY_ICONS.length]!;
              const active = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  data-category-card
                  onClick={() => {
                    setCategoryId(cat.id);
                    setDepartmentId(cat.suggestedDepartmentId);
                  }}
                  className={cn(
                    "rounded-lg border px-4 py-4 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <Icon
                    className={cn(
                      "mb-2 size-5",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <p className="font-medium text-foreground">{cat.name}</p>
                  {cat.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="chief-complaint">Describe your concern</Label>
            <textarea
              id="chief-complaint"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              maxLength={2000}
              placeholder="What has been bothering you, and how has it changed?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration-value">How long?</Label>
              <div className="flex gap-2">
                <Input
                  id="duration-value"
                  type="number"
                  min={0}
                  max={999}
                  value={durationValue}
                  onChange={(e) =>
                    setDurationValue(Number(e.target.value) || 0)
                  }
                />
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={durationUnit}
                  onChange={(e) =>
                    setDurationUnit(
                      e.target.value as "days" | "weeks" | "months",
                    )
                  }
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <div className="flex rounded-md border border-border p-0.5">
                {(["MILD", "MODERATE", "SEVERE"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={cn(
                      "flex-1 rounded px-2 py-1.5 text-xs font-medium capitalize",
                      severity === level
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {level.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("redflags")}
            >
              Back
            </Button>
            <Button type="button" onClick={goToDepartment}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === "department" ? (
        <div className="mx-auto max-w-xl space-y-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Step 3 of 4</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Recommended department
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on what you told us, we suggest{" "}
              <strong className="text-foreground">
                {recommendation?.suggestedDepartment.name ??
                  selectedCategory?.suggestedDepartment.name ??
                  "a department"}
              </strong>
              .
            </p>
            {recommendation?.fallbackUsed && recommendation.fallbackReason ? (
              <p className="mt-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                {recommendation.fallbackReason}
              </p>
            ) : null}
          </div>

          {(recommendation?.doctors.length ?? 0) > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Available doctors</h2>
              <ul className="space-y-2">
                {recommendation!.doctors.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{d.name}</span>
                    {d.nextSlotAt ? (
                      <span className="ml-2 text-muted-foreground">
                        Next: {new Date(d.nextSlotAt).toLocaleString()}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="department-override">Department</Label>
            <select
              id="department-override"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("details")}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={confirmDepartment}
              disabled={createIntake.isPending}
            >
              {createIntake.isPending ? "Saving…" : "Continue to booking"}
            </Button>
          </div>
        </div>
      ) : null}
    </PageEnter>
  );
}
