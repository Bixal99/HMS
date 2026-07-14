"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type ActiveAdmission = {
  id: string;
  carePlan: string | null;
  admittedAt: string;
  patient: { id: string; firstName: string; lastName: string; mrn: string };
  bed: {
    bedNumber: string;
    ward: { name: string; floor: number };
  };
};

type NursingNote = {
  id: string;
  body: string;
  isUrgent: boolean;
  createdAt: string;
};

type MarSuggestion = {
  id: string;
  dosage: string;
  frequency: string;
  medicine: { name: string; strength: string; form: string };
};

type MedAdmin = {
  id: string;
  medicineName: string;
  dose: string;
  route: string;
  givenAt: string;
  notes: string | null;
};

export function NursingBoard() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteUrgent, setNoteUrgent] = useState(false);
  const [carePlan, setCarePlan] = useState("");
  const [marDose, setMarDose] = useState("");
  const [marRoute, setMarRoute] = useState("PO");
  const [marItemId, setMarItemId] = useState<string | null>(null);
  const [marName, setMarName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["active-admissions"],
    queryFn: () =>
      apiFetch<{ data: ActiveAdmission[] }>("/api/admissions/active"),
  });

  const admissions = data?.data ?? [];
  const selected = admissions.find((a) => a.id === selectedId) ?? null;

  const notesQ = useQuery({
    queryKey: ["nursing-notes", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () =>
      apiFetch<{ data: NursingNote[] }>(`/api/admissions/${selectedId}/notes`),
  });

  const marQ = useQuery({
    queryKey: ["mar-suggestions", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () =>
      apiFetch<{ data: MarSuggestion[] }>(
        `/api/admissions/${selectedId}/mar-suggestions`,
      ),
  });

  const adminsQ = useQuery({
    queryKey: ["mar-admins", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () =>
      apiFetch<{ data: MedAdmin[] }>(
        `/api/admissions/${selectedId}/medications`,
      ),
  });

  const openAdmission = (a: ActiveAdmission) => {
    setSelectedId(a.id);
    setCarePlan(a.carePlan ?? "");
    setNoteBody("");
    setNoteUrgent(false);
    setMarItemId(null);
    setMarName("");
    setMarDose("");
  };

  const saveCarePlan = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admissions/${selectedId}/care-plan`, {
        method: "PATCH",
        body: JSON.stringify({ carePlan }),
      }),
    onSuccess: () => {
      toast.success("Care plan saved");
      void queryClient.invalidateQueries({ queryKey: ["active-admissions"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Save failed"),
  });

  const addNote = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admissions/${selectedId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: noteBody, isUrgent: noteUrgent }),
      }),
    onSuccess: () => {
      toast.success(noteUrgent ? "Urgent note sent to doctor" : "Note added");
      setNoteBody("");
      setNoteUrgent(false);
      void queryClient.invalidateQueries({ queryKey: ["nursing-notes", selectedId] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Note failed"),
  });

  const giveMed = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admissions/${selectedId}/medications`, {
        method: "POST",
        body: JSON.stringify({
          prescriptionItemId: marItemId,
          medicineName: marName,
          dose: marDose,
          route: marRoute,
        }),
      }),
    onSuccess: () => {
      toast.success("Medication recorded");
      setMarItemId(null);
      setMarName("");
      setMarDose("");
      void queryClient.invalidateQueries({ queryKey: ["mar-admins", selectedId] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "MAR failed"),
  });

  return (
    <PageEnter>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Nursing board
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Active admissions — notes, care plan, and medication administration.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : admissions.length === 0 ? (
          <EmptyState
            title="No active admissions"
            description="Admitted patients appear here for nursing care."
          />
        ) : (
          <ul className="space-y-2">
            {admissions.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col rounded-lg border bg-card p-4 text-left sm:flex-row sm:items-center sm:justify-between",
                    selectedId === a.id ? "border-primary" : "border-border",
                  )}
                  onClick={() => openAdmission(a)}
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {a.patient.firstName} {a.patient.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.bed.ward.name} / Bed {a.bed.bedNumber} · {a.patient.mrn}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Admitted {format(new Date(a.admittedAt), "MMM d, h:mm a")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Drawer open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DrawerContent className="max-h-[92vh] w-[min(36rem,96vw)]">
          <DrawerHeader>
            <DrawerTitle>
              {selected
                ? `${selected.patient.firstName} ${selected.patient.lastName}`
                : "Admission"}
            </DrawerTitle>
          </DrawerHeader>
          {selected ? (
            <div className="space-y-6 overflow-y-auto px-4 pb-8">
              <section className="space-y-2">
                <Label htmlFor="care-plan">Care plan</Label>
                <textarea
                  id="care-plan"
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={carePlan}
                  onChange={(e) => setCarePlan(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveCarePlan.mutate()}
                  disabled={saveCarePlan.isPending}
                >
                  Save care plan
                </Button>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Nursing notes</h3>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Shift note…"
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={noteUrgent}
                    onChange={(e) => setNoteUrgent(e.target.checked)}
                  />
                  Mark urgent (notify doctor)
                </label>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!noteBody.trim()) {
                      toast.error("Enter a note");
                      return;
                    }
                    addNote.mutate();
                  }}
                  disabled={addNote.isPending}
                >
                  Add note
                </Button>
                <ul className="max-h-40 space-y-2 overflow-auto text-sm">
                  {(notesQ.data?.data ?? []).map((n) => (
                    <li
                      key={n.id}
                      className={cn(
                        "rounded-md border px-3 py-2",
                        n.isUrgent
                          ? "border-destructive/50 bg-destructive/5"
                          : "border-border",
                      )}
                    >
                      <p className="text-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(n.createdAt), "MMM d, h:mm a")}
                        {n.isUrgent ? " · Urgent" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Medication administration (MAR)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select from active prescriptions or enter manually.
                </p>
                <ul className="max-h-32 space-y-1 overflow-auto rounded-md border border-border text-sm">
                  {(marQ.data?.data ?? []).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full flex-col px-2 py-1.5 text-left hover:bg-accent",
                          marItemId === s.id && "bg-primary/10 text-primary",
                        )}
                        onClick={() => {
                          setMarItemId(s.id);
                          setMarName(`${s.medicine.name} ${s.medicine.strength}`);
                          setMarDose(s.dosage);
                        }}
                      >
                        <span className="font-medium">
                          {s.medicine.name} {s.medicine.strength}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.dosage} · {s.frequency}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor="mar-name">Medicine</Label>
                    <Input
                      id="mar-name"
                      value={marName}
                      onChange={(e) => setMarName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mar-dose">Dose</Label>
                    <Input
                      id="mar-dose"
                      value={marDose}
                      onChange={(e) => setMarDose(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="mar-route">Route</Label>
                  <Input
                    id="mar-route"
                    value={marRoute}
                    onChange={(e) => setMarRoute(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!marName.trim() || !marDose.trim()) {
                      toast.error("Medicine and dose required");
                      return;
                    }
                    giveMed.mutate();
                  }}
                  disabled={giveMed.isPending}
                >
                  Record given
                </Button>
                <ul className="max-h-32 space-y-1 overflow-auto text-sm text-muted-foreground">
                  {(adminsQ.data?.data ?? []).map((m) => (
                    <li key={m.id}>
                      {format(new Date(m.givenAt), "h:mm a")} · {m.medicineName}{" "}
                      {m.dose} ({m.route})
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </PageEnter>
  );
}
