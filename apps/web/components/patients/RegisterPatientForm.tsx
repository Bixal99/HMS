"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createPatientFormSchema,
  type CreatePatientFormInput,
} from "@shared/validators";
import { apiFetch } from "@/lib/api";
import { gsap, slideStep } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { bloodGroupLabel } from "@/lib/patients";

const steps = ["demographics", "contact", "insurance", "review"] as const;
type Step = (typeof steps)[number];

const stepFields: Record<Exclude<Step, "review">, (keyof CreatePatientFormInput)[]> = {
  demographics: ["firstName", "lastName", "dob", "gender", "bloodGroup"],
  contact: [
    "phone",
    "email",
    "address",
    "emergencyName",
    "emergencyPhone",
    "emergencyRelation",
  ],
  insurance: ["insuranceProvider", "insurancePolicyNo"],
};

function parseManualDob(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function RegisterPatientForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("demographics");
  const [manualDob, setManualDob] = useState(false);
  const [manualDobText, setManualDobText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const stepPanelRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);

  const form = useForm<CreatePatientFormInput>({
    resolver: zodResolver(createPatientFormSchema) as never,
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "OTHER",
      bloodGroup: "UNKNOWN",
      phone: "",
      email: "",
      address: "",
      emergencyName: "",
      emergencyPhone: "",
      emergencyRelation: "",
      insuranceProvider: "",
      insurancePolicyNo: "",
    },
    mode: "onTouched",
  });

  const stepIndex = steps.indexOf(currentStep);
  const values = form.watch();

  function animateToStep(next: Step, direction: "forward" | "back") {
    const panel = stepPanelRef.current;
    if (panel) {
      const clone = panel.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.inset = "0";
      clone.style.pointerEvents = "none";
      panel.parentElement?.appendChild(clone);
      setCurrentStep(next);
      requestAnimationFrame(() => {
        if (stepPanelRef.current) {
          slideStep(clone, stepPanelRef.current, direction).eventCallback("onComplete", () => {
            clone.remove();
          });
        } else {
          clone.remove();
        }
      });
    } else {
      setCurrentStep(next);
    }
    const fill = progressFillRef.current;
    if (fill) {
      const nextIndex = steps.indexOf(next);
      gsap.to(fill, {
        width: `${((nextIndex + 1) / steps.length) * 100}%`,
        duration: 0.35,
        ease: "power2.out",
      });
    }
  }

  async function goNext() {
    if (currentStep === "review") return;

    if (currentStep === "demographics" && manualDob) {
      const parsed = parseManualDob(manualDobText);
      if (!parsed) {
        form.setError("dob", { message: "Use DD/MM/YYYY" });
        return;
      }
      form.setValue("dob", parsed, { shouldValidate: true });
    }

    const fields = stepFields[currentStep];
    const ok = await form.trigger(fields);
    if (!ok) return;
    animateToStep(steps[stepIndex + 1]!, "forward");
  }

  function goBack() {
    if (stepIndex === 0) return;
    animateToStep(steps[stepIndex - 1]!, "back");
  }

  async function onSubmit(data: CreatePatientFormInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const patient = await apiFetch<{ id: string }>("/api/patients", {
        method: "POST",
        body: JSON.stringify(data),
      });
      router.push(`/patients/${patient.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-foreground">Register patient</CardTitle>
        <CardDescription>Progressive intake — demographics through insurance</CardDescription>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary" aria-label="Registration progress">
          <div
            ref={progressFillRef}
            className="h-full rounded-full bg-primary"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-xs capitalize text-muted-foreground">
          Step {stepIndex + 1} of {steps.length}: {currentStep}
        </p>
      </CardHeader>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="relative min-h-[280px] overflow-hidden">
            <div ref={stepPanelRef} className="space-y-4">
            {currentStep === "demographics" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" {...form.register("firstName")} />
                  {form.formState.errors.firstName ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.firstName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" {...form.register("lastName")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dob">Date of birth</Label>
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => setManualDob((v) => !v)}
                    >
                      {manualDob ? "Use date picker" : "Type DD/MM/YYYY"}
                    </button>
                  </div>
                  {manualDob ? (
                    <Input
                      id="dob"
                      value={manualDobText}
                      onChange={(e) => setManualDobText(e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                  ) : (
                    <Input id="dob" type="date" {...form.register("dob")} />
                  )}
                  {form.formState.errors.dob ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.dob.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...form.register("gender")}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood group</Label>
                  <select
                    id="bloodGroup"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...form.register("bloodGroup")}
                  >
                    {[
                      "UNKNOWN",
                      "A_POS",
                      "A_NEG",
                      "B_POS",
                      "B_NEG",
                      "AB_POS",
                      "AB_NEG",
                      "O_POS",
                      "O_NEG",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {bloodGroupLabel(v)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            {currentStep === "contact" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...form.register("phone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...form.register("address")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Emergency contact</Label>
                  <Input id="emergencyName" {...form.register("emergencyName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency phone</Label>
                  <Input id="emergencyPhone" {...form.register("emergencyPhone")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="emergencyRelation">Relationship</Label>
                  <Input id="emergencyRelation" {...form.register("emergencyRelation")} />
                </div>
              </div>
            ) : null}

            {currentStep === "insurance" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Insurance provider</Label>
                  <Input id="insuranceProvider" {...form.register("insuranceProvider")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurancePolicyNo">Policy number</Label>
                  <Input id="insurancePolicyNo" {...form.register("insurancePolicyNo")} />
                </div>
              </div>
            ) : null}

            {currentStep === "review" ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="text-foreground">
                    {values.firstName} {values.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">DOB</dt>
                  <dd className="text-foreground">
                    {values.dob ? new Date(values.dob).toLocaleDateString() : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="text-foreground">{values.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Blood group</dt>
                  <dd className="text-foreground">{bloodGroupLabel(values.bloodGroup)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Emergency</dt>
                  <dd className="text-foreground">
                    {values.emergencyName || "—"} {values.emergencyPhone || ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Insurance</dt>
                  <dd className="text-foreground">
                    {values.insuranceProvider || "—"} {values.insurancePolicyNo || ""}
                  </dd>
                </div>
              </dl>
            ) : null}

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            </div>
          </CardContent>

          <CardFooter className="justify-between gap-3">
            <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0}>
              Back
            </Button>
            {currentStep !== "review" ? (
              <Button type="button" onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Confirm registration"}
              </Button>
            )}
          </CardFooter>
        </form>
      </FormProvider>
    </Card>
  );
}
