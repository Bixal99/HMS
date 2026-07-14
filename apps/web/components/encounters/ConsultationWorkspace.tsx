"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { apiFetch, API_BASE, ApiError } from "@/lib/api";
import { computeBmi, bmiCategory } from "@/lib/bmi";
import { fadeSavedHint } from "@/lib/motion";
import { SevereAllergyBanner } from "@/components/patients/SevereAllergyBanner";
import { RedFlagLabels } from "@/components/intake/RedFlagScreen";
import { OrderLabForm } from "@/components/lab/OrderLabForm";
import { OrderRadiologyForm } from "@/components/radiology/OrderRadiologyForm";
import { PageEnter } from "@/components/shared/PageEnter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import icd10 from "@/lib/icd10-common.json";

type SoapFields = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type EncounterDetail = {
  id: string;
  patientId: string;
  doctorId: string;
  status: "IN_PROGRESS" | "FINALIZED";
  chiefComplaint: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  finalizedAt: string | null;
  encounterDate: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    dob: string;
    allergies: Array<{
      id: string;
      allergen: string;
      severity: string;
      notes: string | null;
    }>;
  };
  diagnoses: Array<{ id: string; icdCode: string | null; description: string }>;
  vitals: Array<{
    id: string;
    bpSystolic: number | null;
    bpDiastolic: number | null;
    temperatureC: number | null;
    pulseBpm: number | null;
    weightKg: number | null;
    heightCm: number | null;
    recordedAt: string;
  }>;
  prescriptions: Array<{
    id: string;
    status: string;
    items: Array<{
      id: string;
      dosage: string;
      frequency: string;
      durationDays: number;
      medicine: { name: string; strength: string; form: string };
    }>;
  }>;
  appointment?: {
    id: string;
    scheduledAt: string;
    status: string;
    reasonForVisit: string | null;
    intake?: {
      id: string;
      chiefComplaintText: string;
      durationValue: number;
      durationUnit: string;
      severity: string;
      redFlagsSelected: string[];
      isUrgent: boolean;
      symptomCategory: { id: string; name: string };
    } | null;
  } | null;
  context: {
    allergies: Array<{
      id: string;
      allergen: string;
      severity: string;
      notes: string | null;
    }>;
    lastVitals: EncounterDetail["vitals"][number] | null;
    activeMeds: EncounterDetail["prescriptions"];
  };
};

type Medicine = {
  id: string;
  name: string;
  genericName: string | null;
  form: string;
  strength: string;
};

type Panel =
  | "vitals"
  | "diagnosis"
  | "prescription"
  | "lab"
  | "radiology"
  | "surgery"
  | "followup"
  | null;

const SOAP_KEYS: Array<keyof SoapFields> = [
  "subjective",
  "objective",
  "assessment",
  "plan",
];

export function ConsultationWorkspace({
  encounterId,
  role,
}: {
  encounterId: string;
  role: string;
}) {
  const queryClient = useQueryClient();
  const [allergyAck, setAllergyAck] = useState(false);
  const [soap, setSoap] = useState<SoapFields>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [addendumOpen, setAddendumOpen] = useState(false);
  const [addendumText, setAddendumText] = useState("");
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const savedRef = useRef<HTMLSpanElement>(null);
  const dirtyRef = useRef(false);

  const { data: encounter, isLoading, error } = useQuery({
    queryKey: ["encounter", encounterId],
    queryFn: () => apiFetch<EncounterDetail>(`/api/encounters/${encounterId}`),
  });

  useEffect(() => {
    if (!encounter) return;
    setSoap({
      subjective: encounter.subjective ?? "",
      objective: encounter.objective ?? "",
      assessment: encounter.assessment ?? "",
      plan: encounter.plan ?? "",
    });
    dirtyRef.current = false;
  }, [encounter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const canEditNotes = role === "DOCTOR" && encounter?.status === "IN_PROGRESS";
  const canAddendum = role === "DOCTOR" && encounter?.status === "FINALIZED";
  const canVitals = role === "DOCTOR" || role === "NURSE";
  const canClinical = role === "DOCTOR";
  const readOnlyNotes =
    role !== "DOCTOR" ||
    (encounter?.status === "FINALIZED" && !addendumOpen);

  const persistNotes = useCallback(
    async (fields: Partial<SoapFields>) => {
      if (role !== "DOCTOR") return;
      const updated = await apiFetch<EncounterDetail>(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      dirtyRef.current = false;
      setSoap((prev) => ({
        subjective: fields.subjective ?? prev.subjective,
        objective: fields.objective ?? prev.objective,
        assessment: fields.assessment ?? prev.assessment,
        plan: fields.plan ?? prev.plan,
      }));
      setSavedAt(new Date());
      if (savedRef.current) fadeSavedHint(savedRef.current);
      queryClient.setQueryData(["encounter", encounterId], (prev: EncounterDetail | undefined) =>
        prev ? { ...prev, ...updated, context: prev.context } : updated,
      );
    },
    [encounterId, queryClient, role],
  );

  const debouncedSave = useDebouncedCallback((fields: SoapFields) => {
    if (!dirtyRef.current) return;
    if (!(role === "DOCTOR" && (canEditNotes || addendumOpen))) return;
    void persistNotes(fields).catch((err) =>
      toast.error(err instanceof Error ? err.message : "Autosave failed"),
    );
  }, 15_000);

  function updateSoap(key: keyof SoapFields, value: string) {
    if (readOnlyNotes) return;
    dirtyRef.current = true;
    setSoap((prev) => {
      const next = { ...prev, [key]: value };
      debouncedSave(next);
      return next;
    });
  }

  async function flushOnBlur() {
    if (!dirtyRef.current) return;
    if (!(role === "DOCTOR" && (canEditNotes || addendumOpen))) return;
    try {
      await persistNotes(soap);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  const finalizeMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/encounters/${encounterId}/finalize`, { method: "PATCH", body: "{}" }),
    onSuccess: () => {
      toast.success("Encounter finalized");
      setConfirmFinalize(false);
      void queryClient.invalidateQueries({ queryKey: ["encounter", encounterId] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Finalize failed"),
  });

  const addendumMutation = useMutation({
    mutationFn: async () => {
      const stamp = format(new Date(), "yyyy-MM-dd HH:mm");
      const nextPlan = `${soap.plan}\n\n[Addendum ${stamp}]\n${addendumText.trim()}`.trim();
      return persistNotes({ plan: nextPlan });
    },
    onSuccess: () => {
      toast.success("Addendum recorded");
      setAddendumText("");
      setAddendumOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["encounter", encounterId] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Addendum failed"),
  });

  const severeAllergies = useMemo(
    () =>
      (encounter?.context.allergies ?? encounter?.patient.allergies ?? []).filter(
        (a) => a.severity === "SEVERE",
      ),
    [encounter],
  );

  if (isLoading) {
    return (
      <PageEnter>
        <p className="text-sm text-muted-foreground">Loading encounter…</p>
      </PageEnter>
    );
  }

  if (error || !encounter) {
    return (
      <PageEnter>
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Encounter not found"}
        </p>
      </PageEnter>
    );
  }

  const lastVitals = encounter.vitals[0] ?? encounter.context.lastVitals;

  const downloadPdf = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/encounters/${encounterId}/export`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "PDF export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visit-${encounter.patient.mrn}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF export failed");
    }
  };

  return (
    <PageEnter>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_220px] lg:items-start">
        {/* Left: patient snapshot */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {encounter.patient.firstName} {encounter.patient.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">{encounter.patient.mrn}</p>
          </div>

          <SevereAllergyBanner
            allergies={severeAllergies}
            acknowledged={allergyAck}
            onAcknowledge={() => setAllergyAck(true)}
          />

          {encounter.appointment?.intake ? (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reason for visit
              </h2>
              {Array.isArray(encounter.appointment.intake.redFlagsSelected) &&
              encounter.appointment.intake.redFlagsSelected.length > 0 ? (
                <RedFlagLabels
                  keys={encounter.appointment.intake.redFlagsSelected}
                />
              ) : null}
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Category: </span>
                {encounter.appointment.intake.symptomCategory.name}
              </p>
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Duration: </span>
                {encounter.appointment.intake.durationValue}{" "}
                {encounter.appointment.intake.durationUnit}
              </p>
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">Severity: </span>
                {encounter.appointment.intake.severity.toLowerCase()}
              </p>
              <p className="text-sm text-foreground">
                {encounter.appointment.intake.chiefComplaintText}
              </p>
            </section>
          ) : encounter.chiefComplaint ? (
            <section className="space-y-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reason for visit
              </h2>
              <p className="text-sm text-foreground">{encounter.chiefComplaint}</p>
            </section>
          ) : null}

          <section className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active meds
            </h2>
            {(encounter.context.activeMeds?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">None pending</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {encounter.context.activeMeds.flatMap((rx) =>
                  rx.items.map((item) => (
                    <li key={item.id}>
                      {item.medicine.name} {item.medicine.strength}
                    </li>
                  )),
                )}
              </ul>
            )}
          </section>

          <section className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last vitals
            </h2>
            {lastVitals ? (
              <p className="text-sm text-foreground">
                {[
                  lastVitals.bpSystolic != null
                    ? `BP ${lastVitals.bpSystolic}/${lastVitals.bpDiastolic}`
                    : null,
                  lastVitals.pulseBpm != null ? `P ${lastVitals.pulseBpm}` : null,
                  lastVitals.temperatureC != null ? `T ${lastVitals.temperatureC}°C` : null,
                  lastVitals.weightKg != null ? `${lastVitals.weightKg} kg` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No vitals yet</p>
            )}
          </section>
        </aside>

        {/* Center: SOAP */}
        <main className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-medium text-foreground">SOAP note</h2>
              <p className="text-xs text-muted-foreground">
                {encounter.status === "FINALIZED"
                  ? "Finalized — further edits are addenda"
                  : "Autosaves every 15s and on blur"}
              </p>
            </div>
            {savedAt ? (
              <span ref={savedRef} className="text-xs text-muted-foreground">
                Saved · {format(savedAt, "h:mm a")}
              </span>
            ) : null}
          </div>

          {SOAP_KEYS.map((key) => (
            <fieldset
              key={key}
              className={cn(
                "rounded-md border border-border p-3",
                encounter.status === "FINALIZED" && !addendumOpen && "bg-muted/40",
              )}
            >
              <legend className="px-1 text-sm font-medium capitalize text-foreground">
                {key}
              </legend>
              <textarea
                className={cn(
                  "mt-1 min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  readOnlyNotes && "cursor-default bg-muted/30",
                )}
                value={soap[key]}
                readOnly={readOnlyNotes}
                onChange={(e) => updateSoap(key, e.target.value)}
                onBlur={() => void flushOnBlur()}
                aria-label={key}
              />
            </fieldset>
          ))}

          {canAddendum ? (
            <div className="space-y-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
              {!addendumOpen ? (
                <Button type="button" variant="outline" onClick={() => setAddendumOpen(true)}>
                  Add addendum
                </Button>
              ) : (
                <>
                  <Label htmlFor="addendum">Addendum (timestamped into Plan)</Label>
                  <textarea
                    id="addendum"
                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={addendumText}
                    onChange={(e) => setAddendumText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => addendumMutation.mutate()}
                      disabled={!addendumText.trim() || addendumMutation.isPending}
                    >
                      Save addendum
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setAddendumOpen(false);
                        setAddendumText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {encounter.diagnoses.length > 0 ? (
            <section>
              <h3 className="text-sm font-medium text-foreground">Diagnoses</h3>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {encounter.diagnoses.map((d) => (
                  <li key={d.id}>
                    {d.icdCode ? `${d.icdCode} — ` : ""}
                    {d.description}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(role === "DOCTOR" || role === "PATIENT" || role === "ADMIN") &&
          (encounter.status === "FINALIZED" || role === "DOCTOR") ? (
            <Button type="button" variant="outline" onClick={() => void downloadPdf()}>
              Download visit PDF
            </Button>
          ) : null}
        </main>

        {/* Right: quick actions */}
        <aside className="space-y-2 lg:sticky lg:top-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick actions
          </h2>
          {canVitals ? (
            <Button
              type="button"
              className="w-full justify-start"
              variant={panel === "vitals" ? "default" : "outline"}
              onClick={() => setPanel(panel === "vitals" ? null : "vitals")}
            >
              Record vitals
            </Button>
          ) : null}
          {canClinical ? (
            <>
              <Button
                type="button"
                className="w-full justify-start"
                variant={panel === "diagnosis" ? "default" : "outline"}
                onClick={() => setPanel(panel === "diagnosis" ? null : "diagnosis")}
              >
                Add diagnosis
              </Button>
              <Button
                type="button"
                className="w-full justify-start"
                variant={panel === "prescription" ? "default" : "outline"}
                onClick={() => setPanel(panel === "prescription" ? null : "prescription")}
              >
                Write prescription
              </Button>
            </>
          ) : null}
          {canClinical ? (
            <>
              <Button
                type="button"
                className="w-full justify-start"
                variant={panel === "lab" ? "default" : "outline"}
                onClick={() => setPanel(panel === "lab" ? null : "lab")}
              >
                Order lab
              </Button>
              <Button
                type="button"
                className="w-full justify-start"
                variant={panel === "radiology" ? "default" : "outline"}
                onClick={() => setPanel(panel === "radiology" ? null : "radiology")}
              >
                Order imaging
              </Button>
              <Button
                type="button"
                className="w-full justify-start"
                variant={panel === "surgery" ? "default" : "outline"}
                onClick={() => setPanel(panel === "surgery" ? null : "surgery")}
              >
                Recommend surgery
              </Button>
              <Button
                type="button"
                className="w-full justify-start"
                variant="outline"
                onClick={() => {
                  void apiFetch(`/api/encounters/${encounterId}/request-admit`, {
                    method: "POST",
                    body: JSON.stringify({}),
                  })
                    .then(() => toast.success("Reception notified to admit patient"))
                    .catch((err) =>
                      toast.error(
                        err instanceof ApiError ? err.message : "Could not notify reception",
                      ),
                    );
                }}
              >
                Request admission
              </Button>
              <Button
                type="button"
                className="w-full justify-start"
                variant={panel === "followup" ? "default" : "outline"}
                onClick={() => setPanel(panel === "followup" ? null : "followup")}
              >
                Request follow-up
              </Button>
            </>
          ) : null}
          {canClinical && encounter.status === "IN_PROGRESS" ? (
            <Button
              type="button"
              className="w-full justify-start"
              variant="secondary"
              onClick={() => setConfirmFinalize(true)}
            >
              Finalize encounter
            </Button>
          ) : null}

          {panel === "vitals" && canVitals ? (
            <VitalsForm
              encounterId={encounterId}
              onDone={() => {
                setPanel(null);
                void queryClient.invalidateQueries({ queryKey: ["encounter", encounterId] });
              }}
            />
          ) : null}
          {panel === "diagnosis" && canClinical ? (
            <DiagnosisForm
              encounterId={encounterId}
              onDone={() => {
                setPanel(null);
                void queryClient.invalidateQueries({ queryKey: ["encounter", encounterId] });
              }}
            />
          ) : null}
          {panel === "prescription" && canClinical ? (
            <PrescriptionForm
              encounterId={encounterId}
              onDone={() => {
                setPanel(null);
                void queryClient.invalidateQueries({ queryKey: ["encounter", encounterId] });
              }}
            />
          ) : null}
          {panel === "lab" && canClinical ? (
            <OrderLabForm
              encounterId={encounterId}
              onDone={() => {
                setPanel(null);
              }}
            />
          ) : null}
          {panel === "radiology" && canClinical ? (
            <OrderRadiologyForm
              encounterId={encounterId}
              onDone={() => {
                setPanel(null);
              }}
            />
          ) : null}
          {panel === "surgery" && canClinical ? (
            <RecommendSurgeryForm
              encounterId={encounterId}
              patientId={encounter.patientId}
              onDone={() => setPanel(null)}
            />
          ) : null}
          {panel === "followup" && canClinical ? (
            <RequestFollowUpForm
              encounterId={encounterId}
              onDone={() => setPanel(null)}
            />
          ) : null}
        </aside>
      </div>

      {confirmFinalize ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finalize-title"
        >
          <div className="max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <h3 id="finalize-title" className="text-base font-semibold text-foreground">
              Finalize this encounter?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              After finalization, the original SOAP note stays locked. Any later edits are saved as
              clearly labeled addenda — never silent overwrites.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmFinalize(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending}
              >
                Finalize
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageEnter>
  );
}

function VitalsForm({
  encounterId,
  onDone,
}: {
  encounterId: string;
  onDone: () => void;
}) {
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [pulseBpm, setPulseBpm] = useState("");
  const [temperatureC, setTemperatureC] = useState("");

  const bmi = computeBmi(
    weightKg ? Number(weightKg) : null,
    heightCm ? Number(heightCm) : null,
  );

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/encounters/${encounterId}/vitals`, {
        method: "POST",
        body: JSON.stringify({
          weightKg: weightKg ? Number(weightKg) : null,
          heightCm: heightCm ? Number(heightCm) : null,
          bpSystolic: bpSystolic ? Number(bpSystolic) : null,
          bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
          pulseBpm: pulseBpm ? Number(pulseBpm) : null,
          temperatureC: temperatureC ? Number(temperatureC) : null,
        }),
      }),
    onSuccess: () => {
      toast.success("Vitals recorded");
      onDone();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to save vitals"),
  });

  return (
    <form
      className="space-y-2 rounded-md border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="bp-sys">BP sys</Label>
          <Input id="bp-sys" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bp-dia">BP dia</Label>
          <Input
            id="bp-dia"
            value={bpDiastolic}
            onChange={(e) => setBpDiastolic(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="pulse">Pulse</Label>
          <Input id="pulse" value={pulseBpm} onChange={(e) => setPulseBpm(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="temp">Temp °C</Label>
          <Input
            id="temp"
            value={temperatureC}
            onChange={(e) => setTemperatureC(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="wt">Weight kg</Label>
          <Input id="wt" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ht">Height cm</Label>
          <Input id="ht" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
        </div>
      </div>
      {bmi != null ? (
        <p className="text-sm text-foreground" aria-live="polite">
          BMI {bmi} · {bmiCategory(bmi)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Enter weight and height for live BMI</p>
      )}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        Save vitals
      </Button>
    </form>
  );
}

function DiagnosisForm({
  encounterId,
  onDone,
}: {
  encounterId: string;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [description, setDescription] = useState("");
  const [icdCode, setIcdCode] = useState<string | null>(null);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return (icd10 as Array<{ code: string; description: string }>)
      .filter(
        (row) =>
          row.code.toLowerCase().includes(needle) ||
          row.description.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [q]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/encounters/${encounterId}/diagnoses`, {
        method: "POST",
        body: JSON.stringify({ description, icdCode }),
      }),
    onSuccess: () => {
      toast.success("Diagnosis added");
      onDone();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to add diagnosis"),
  });

  return (
    <form
      className="space-y-2 rounded-md border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!description.trim()) return;
        mutation.mutate();
      }}
    >
      <Label htmlFor="icd-q">ICD-10 search</Label>
      <Input
        id="icd-q"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setIcdCode(null);
        }}
        placeholder="Code or description…"
      />
      {matches.length > 0 ? (
        <ul className="max-h-32 overflow-auto rounded-md border border-border text-sm">
          {matches.map((m) => (
            <li key={m.code}>
              <button
                type="button"
                className="flex w-full px-2 py-1.5 text-left hover:bg-accent"
                onClick={() => {
                  setIcdCode(m.code);
                  setDescription(m.description);
                  setQ(`${m.code} — ${m.description}`);
                }}
              >
                <span className="font-medium">{m.code}</span>
                <span className="ml-2 text-muted-foreground">{m.description}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Label htmlFor="dx-desc">Description</Label>
      <Input
        id="dx-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      {icdCode ? (
        <p className="text-xs text-muted-foreground">Code: {icdCode}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Free-text diagnosis (no ICD code) is allowed</p>
      )}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        Add diagnosis
      </Button>
    </form>
  );
}

function PrescriptionForm({
  encounterId,
  onDone,
}: {
  encounterId: string;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [medicineLabel, setMedicineLabel] = useState("");
  const [dosage, setDosage] = useState("1 tablet");
  const [frequency, setFrequency] = useState("twice daily");
  const [durationDays, setDurationDays] = useState("5");
  const [quantityPrescribed, setQuantityPrescribed] = useState("10");
  const [notes, setNotes] = useState("");
  const [selectedStock, setSelectedStock] = useState<number | null>(null);

  const { data: meds } = useQuery({
    queryKey: ["medicines", q],
    enabled: q.trim().length >= 1,
    queryFn: () =>
      apiFetch<{ data: Medicine[] }>(
        `/api/medicines/search?q=${encodeURIComponent(q.trim())}`,
      ),
  });

  const { data: stockCatalog } = useQuery({
    queryKey: ["pharmacy-medicines"],
    queryFn: () =>
      apiFetch<{ data: Array<{ id: string; totalStock: number; lowStock: boolean }> }>(
        "/api/pharmacy/medicines",
      ),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/encounters/${encounterId}/prescriptions`, {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              medicineId,
              dosage,
              frequency,
              durationDays: Number(durationDays),
              quantityPrescribed: Number(quantityPrescribed),
              notes: notes || null,
            },
          ],
        }),
      }),
    onSuccess: () => {
      toast.success("Prescription issued");
      onDone();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Prescription failed"),
  });

  return (
    <form
      className="space-y-2 rounded-md border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!medicineId) {
          toast.error("Select a medicine");
          return;
        }
        mutation.mutate();
      }}
    >
      <Label htmlFor="med-q">Medicine</Label>
      <Input
        id="med-q"
        value={q || medicineLabel}
        onChange={(e) => {
          setQ(e.target.value);
          setMedicineId("");
          setMedicineLabel("");
        }}
        placeholder="Search catalog…"
      />
      {meds?.data?.length ? (
        <ul className="max-h-32 overflow-auto rounded-md border border-border text-sm">
          {meds.data.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full flex-col px-2 py-1.5 text-left hover:bg-accent"
                onClick={() => {
                  setMedicineId(m.id);
                  setMedicineLabel(`${m.name} ${m.strength}`);
                  setQ("");
                  const stock = stockCatalog?.data.find((s) => s.id === m.id);
                  setSelectedStock(stock?.totalStock ?? null);
                }}
              >
                <span className="font-medium">
                  {m.name} {m.strength}
                </span>
                <span className="text-xs text-muted-foreground">
                  {m.genericName ?? m.form}
                  {stockCatalog?.data.find((s) => s.id === m.id) != null
                    ? ` · stock ${stockCatalog.data.find((s) => s.id === m.id)!.totalStock}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Label htmlFor="dosage">Dosage</Label>
      <Input id="dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} required />
      <Label htmlFor="freq">Frequency</Label>
      <Input
        id="freq"
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
        required
      />
      <Label htmlFor="days">Duration (days)</Label>
      <Input
        id="days"
        type="number"
        min={1}
        value={durationDays}
        onChange={(e) => setDurationDays(e.target.value)}
        required
      />
      <Label htmlFor="qty">Quantity prescribed</Label>
      <Input
        id="qty"
        type="number"
        min={1}
        value={quantityPrescribed}
        onChange={(e) => setQuantityPrescribed(e.target.value)}
        required
      />
      {selectedStock != null ? (
        <p className="text-xs text-muted-foreground">
          Pharmacy stock on hand: {selectedStock}
          {/* Task 07: stock visibility for doctors while prescribing; dispensing remains pharmacist-only. */}
        </p>
      ) : null}
      <Label htmlFor="rx-notes">Notes</Label>
      <Input id="rx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        Issue prescription
      </Button>
    </form>
  );
}

function RecommendSurgeryForm({
  encounterId,
  patientId,
  onDone,
}: {
  encounterId: string;
  patientId: string;
  onDone: () => void;
}) {
  const [procedureName, setProcedureName] = useState("");
  const [urgency, setUrgency] = useState<"ELECTIVE" | "URGENT" | "EMERGENCY">(
    "ELECTIVE",
  );

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/surgery/requests", {
        method: "POST",
        body: JSON.stringify({
          encounterId,
          patientId,
          procedureName,
          urgency,
        }),
      }),
    onSuccess: () => {
      toast.success("Surgery requested");
      onDone();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Request failed"),
  });

  return (
    <form
      className="space-y-2 rounded-md border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!procedureName.trim()) {
          toast.error("Enter a procedure name");
          return;
        }
        mutation.mutate();
      }}
    >
      <Label htmlFor="surg-proc">Procedure</Label>
      <Input
        id="surg-proc"
        value={procedureName}
        onChange={(e) => setProcedureName(e.target.value)}
        placeholder="e.g. Laparoscopic appendectomy"
        required
      />
      <Label htmlFor="surg-urgency">Urgency</Label>
      <select
        id="surg-urgency"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={urgency}
        onChange={(e) =>
          setUrgency(e.target.value as "ELECTIVE" | "URGENT" | "EMERGENCY")
        }
      >
        <option value="ELECTIVE">Elective</option>
        <option value="URGENT">Urgent</option>
        <option value="EMERGENCY">Emergency</option>
      </select>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        Submit surgery request
      </Button>
    </form>
  );
}

function RequestFollowUpForm({
  encounterId,
  onDone,
}: {
  encounterId: string;
  onDone: () => void;
}) {
  const [preferredDate, setPreferredDate] = useState("");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/encounters/${encounterId}/request-follow-up`, {
        method: "POST",
        body: JSON.stringify({
          preferredDate: preferredDate || null,
          note: note || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Reception and patient notified for follow-up");
      onDone();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Request failed"),
  });

  return (
    <form
      className="space-y-2 rounded-md border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Label htmlFor="fu-date">Preferred date (optional)</Label>
      <Input
        id="fu-date"
        type="date"
        value={preferredDate}
        onChange={(e) => setPreferredDate(e.target.value)}
      />
      <Label htmlFor="fu-note">Note (optional)</Label>
      <Input
        id="fu-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Review labs in 2 weeks"
      />
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        Notify reception
      </Button>
    </form>
  );
}
