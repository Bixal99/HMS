"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, API_BASE } from "@/lib/api";
import {
  ageFromDob,
  bloodGroupLabel,
  type Patient,
  type PatientTimeline,
} from "@/lib/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SevereAllergyBanner } from "@/components/patients/SevereAllergyBanner";

type Tab = "overview" | "timeline" | "documents";

export function PatientProfile({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [allergyAck, setAllergyAck] = useState(false);
  const [copied, setCopied] = useState(false);
  const tablistId = useId();

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => apiFetch<Patient>(`/api/patients/${patientId}`),
  });

  const { data: timeline } = useQuery({
    queryKey: ["patient-timeline", patientId],
    queryFn: () => apiFetch<PatientTimeline>(`/api/patients/${patientId}/timeline`),
    enabled: tab === "timeline",
  });

  const allergyMutation = useMutation({
    mutationFn: (body: { allergen: string; severity: string; notes?: string }) =>
      apiFetch(`/api/patients/${patientId}/allergies`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", "SCAN");
      return apiFetch(`/api/patients/${patientId}/documents`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
    },
  });

  const severeAllergies =
    patient?.allergies?.filter((a) => a.severity === "SEVERE") ?? [];

  const onKeyDownTabs = useCallback(
    (event: React.KeyboardEvent) => {
      const order: Tab[] = ["overview", "timeline", "documents"];
      const idx = order.indexOf(tab);
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setTab(order[(idx + 1) % order.length]!);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setTab(order[(idx - 1 + order.length) % order.length]!);
      }
    },
    [tab],
  );

  useEffect(() => {
    setAllergyAck(false);
  }, [patientId, severeAllergies.length]);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  }

  if (error || !patient) {
    return (
      <p className="text-destructive">
        {(error as Error)?.message ?? "Patient not found"}
      </p>
    );
  }

  async function copyMrn() {
    await navigator.clipboard.writeText(patient!.mrn);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl text-foreground">
                {patient.firstName} {patient.lastName}
              </CardTitle>
              <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-foreground">{patient.mrn}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Copy medical record number"
                  onClick={copyMrn}
                >
                  {copied ? "Copied" : "Copy MRN"}
                </Button>
                {patient.dob ? (
                  <span>Age {ageFromDob(patient.dob)}</span>
                ) : null}
                <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
                  {bloodGroupLabel(patient.bloodGroup)}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <SevereAllergyBanner
        allergies={severeAllergies}
        acknowledged={allergyAck}
        onAcknowledge={() => setAllergyAck(true)}
      />

      <div
        role="tablist"
        aria-label="Patient sections"
        id={tablistId}
        className="flex gap-2 border-b border-border"
        onKeyDown={onKeyDownTabs}
      >
        {(
          [
            ["overview", "Overview"],
            ["timeline", "Timeline"],
            ["documents", "Documents"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${tablistId}-${id}`}
            aria-selected={tab === id}
            aria-controls={`${tablistId}-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={`border-b-2 px-3 py-2 text-sm ${
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div
          role="tabpanel"
          id={`${tablistId}-panel-overview`}
          aria-labelledby={`${tablistId}-overview`}
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demographics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Phone:</span> {patient.phone ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {patient.email ?? "—"}
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Address:</span>{" "}
                {patient.address ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Insurance:</span>{" "}
                {patient.insuranceProvider ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Policy:</span>{" "}
                {patient.insurancePolicyNo ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Allergies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(patient.allergies?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No allergies recorded.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {patient.allergies!.map((a) => (
                    <li key={a.id} className="rounded-md border border-border p-2">
                      <span className="font-medium text-foreground">{a.allergen}</span>
                      <span className="ml-2 text-muted-foreground">{a.severity}</span>
                      {a.notes ? <p className="text-muted-foreground">{a.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="grid gap-2 sm:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  allergyMutation.mutate({
                    allergen: String(fd.get("allergen") ?? ""),
                    severity: String(fd.get("severity") ?? "MILD"),
                    notes: String(fd.get("notes") ?? "") || undefined,
                  });
                  e.currentTarget.reset();
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="allergen">Allergen</Label>
                  <Input id="allergen" name="allergen" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="severity">Severity</Label>
                  <select
                    id="severity"
                    name="severity"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    defaultValue="MILD"
                  >
                    <option value="MILD">Mild</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="SEVERE">Severe</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" />
                </div>
                <Button type="submit" className="sm:col-span-3" disabled={allergyMutation.isPending}>
                  Add allergy
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "timeline" ? (
        <div
          role="tabpanel"
          id={`${tablistId}-panel-timeline`}
          aria-labelledby={`${tablistId}-timeline`}
          className="space-y-3"
        >
          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <p className="text-muted-foreground">
                Registered {timeline ? new Date(timeline.registeredAt).toLocaleString() : "…"}
              </p>
              <section>
                <h3 className="font-medium text-foreground">Appointments</h3>
                <p className="text-muted-foreground">Not yet available</p>
              </section>
              <section>
                <h3 className="font-medium text-foreground">Encounters</h3>
                <p className="text-muted-foreground">Not yet available</p>
              </section>
              <section>
                <h3 className="font-medium text-foreground">Invoices</h3>
                {!timeline?.invoices?.length ? (
                  <p className="text-muted-foreground">No invoices yet</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {timeline.invoices.map((inv) => (
                      <li key={inv.id} className="flex justify-between gap-2">
                        <Link
                          href={`/billing/${inv.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          #{inv.id.slice(0, 8)} · {inv.status.replaceAll("_", " ")}
                        </Link>
                        <span className="text-muted-foreground">
                          ${(inv.totalCents / 100).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "documents" ? (
        <div
          role="tabpanel"
          id={`${tablistId}-panel-documents`}
          aria-labelledby={`${tablistId}-documents`}
          className="space-y-3"
        >
          <Card>
            <CardContent className="space-y-3 p-4">
              <input
                type="file"
                aria-label="Upload patient document"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                }}
              />
              <ul className="space-y-2 text-sm">
                {(patient.documents ?? []).map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between border-b border-border py-2">
                    <span>
                      {doc.docType} · {new Date(doc.createdAt).toLocaleString()}
                    </span>
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={`${API_BASE}${doc.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  </li>
                ))}
                {(patient.documents?.length ?? 0) === 0 ? (
                  <li className="text-muted-foreground">No documents uploaded.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
