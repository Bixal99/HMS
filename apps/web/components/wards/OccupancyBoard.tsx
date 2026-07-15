"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { apiFetch, API_BASE, ApiError } from "@/lib/api";
import { bedStatusFlip, staggerCards } from "@/lib/motion";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { InlineLoader } from "@/components/shared/InlineLoader";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { SearchInput, isTypeaheadBusy } from "@/components/shared/SearchInput";
import { cn } from "@/lib/utils";
import { BedDouble, ArrowRightLeft, LogOut } from "lucide-react";


type BedStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";

type PatientBrief = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
};

type ActiveAdmission = {
  id: string;
  patientId: string;
  bedId: string;
  admittedAt: string;
  patient: PatientBrief;
};

type Bed = {
  id: string;
  wardId: string;
  bedNumber: string;
  bedType: string;
  dailyRateCents: number;
  status: BedStatus;
  activeAdmission: ActiveAdmission | null;
};

type WardOccupancy = {
  id: string;
  name: string;
  floor: number;
  department: { id: string; name: string };
  beds: Bed[];
};

type DischargeChecklist = {
  pendingLabResults: { count: number; blocking: boolean };
  outstandingInvoice: {
    available: boolean;
    note: string;
    count?: number;
    blocking?: boolean;
    invoices?: Array<{ id: string; status: string; totalCents: number }>;
  };
  medicationReconciliation: { requiresManualAck: boolean };
};

type OccupancyBoardProps = {
  role: string;
};

const STATUS_STYLE: Record<BedStatus, string> = {
  AVAILABLE:
    "border-emerald-600/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
  OCCUPIED:
    "border-rose-600/40 bg-rose-500/20 text-rose-950 dark:text-rose-50",
  MAINTENANCE:
    "border-zinc-500/40 bg-zinc-400/25 text-zinc-800 dark:text-zinc-100",
};

const STATUS_LABEL: Record<BedStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  MAINTENANCE: "Maintenance",
};

type BedEvent = {
  bedId: string;
  wardId: string;
  status: BedStatus;
  admissionId?: string | null;
  patientId?: string | null;
};

export function OccupancyBoard({ role }: OccupancyBoardProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortKey, setSortKey] = useState<"ward" | "bed" | "status">("ward");
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitBed, setAdmitBed] = useState<Bed | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientId, setPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientBrief | null>(
    null,
  );
  const [dischargeAdmission, setDischargeAdmission] =
    useState<ActiveAdmission | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [medsAck, setMedsAck] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [transferAdmission, setTransferAdmission] =
    useState<ActiveAdmission | null>(null);
  const [transferToBedId, setTransferToBedId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const prevStatus = useRef<Map<string, BedStatus>>(new Map());

  const canAdmit = ["DOCTOR", "NURSE", "ADMIN", "RECEPTIONIST"].includes(role);
  const canDischarge = ["DOCTOR", "ADMIN"].includes(role);
  const canTransfer = ["NURSE", "ADMIN"].includes(role);

  const occupancyKey = ["wards-occupancy"] as const;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: occupancyKey,
    queryFn: () => apiFetch<{ data: WardOccupancy[] }>("/api/wards/occupancy"),
  });

  const wards = data?.data ?? [];

  const {
    data: patientHits,
    isFetching: patientSearchFetching,
  } = useQuery({
    queryKey: ["patient-search", patientQuery],
    enabled:
      admitOpen && !selectedPatient && patientQuery.trim().length >= 1,
    queryFn: () =>
      apiFetch<{ data: PatientBrief[] }>(
        `/api/patients?q=${encodeURIComponent(patientQuery.trim())}&pageSize=8`,
      ),
  });

  const { data: checklist, isFetching: checklistLoading } = useQuery({
    queryKey: ["discharge-checklist", dischargeAdmission?.id],
    enabled: Boolean(dischargeAdmission?.id),
    queryFn: () =>
      apiFetch<DischargeChecklist>(
        `/api/admissions/${dischargeAdmission!.id}/discharge-checklist`,
      ),
  });

  useEffect(() => {
    const socket: Socket = io(API_BASE, { withCredentials: true });

    socket.on("ward:bed_status_changed", (payload: BedEvent) => {
      queryClient.setQueryData<{ data: WardOccupancy[] }>(occupancyKey, (prev) => {
        if (!prev?.data) return prev;
        return {
          data: prev.data.map((ward) => {
            if (ward.id !== payload.wardId) return ward;
            return {
              ...ward,
              beds: ward.beds.map((bed) => {
                if (bed.id !== payload.bedId) return bed;
                const nextStatus = payload.status;
                let activeAdmission = bed.activeAdmission;
                if (nextStatus === "AVAILABLE" || nextStatus === "MAINTENANCE") {
                  activeAdmission = null;
                } else if (
                  nextStatus === "OCCUPIED" &&
                  payload.admissionId &&
                  payload.patientId
                ) {
                  // Keep existing patient details if same admission; otherwise clear until refetch
                  if (activeAdmission?.id === payload.admissionId) {
                    // unchanged
                  } else if (
                    activeAdmission &&
                    activeAdmission.patientId === payload.patientId
                  ) {
                    activeAdmission = {
                      ...activeAdmission,
                      id: payload.admissionId,
                      bedId: bed.id,
                    };
                  } else {
                    // Soft patch — full patient name arrives on next occupancy fetch if missing
                    activeAdmission = activeAdmission ?? {
                      id: payload.admissionId,
                      patientId: payload.patientId,
                      bedId: bed.id,
                      admittedAt: new Date().toISOString(),
                      patient: {
                        id: payload.patientId,
                        firstName: "…",
                        lastName: "",
                        mrn: "",
                      },
                    };
                  }
                }
                return { ...bed, status: nextStatus, activeAdmission };
              }),
            };
          }),
        };
      });
      // Refresh soon so patient names stay accurate after admit/transfer
      void queryClient.invalidateQueries({ queryKey: occupancyKey });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  useEffect(() => {
    const root = gridRef.current;
    if (!root || view !== "grid") return;
    const tiles = root.querySelectorAll<HTMLElement>("[data-bed-tile]");
    if (tiles.length) staggerCards(tiles);
  }, [view, wards.length]);

  useEffect(() => {
    for (const ward of wards) {
      for (const bed of ward.beds) {
        const prev = prevStatus.current.get(bed.id);
        if (prev && prev !== bed.status) {
          const el = tileRefs.current.get(bed.id);
          if (el) bedStatusFlip(el);
        }
        prevStatus.current.set(bed.id, bed.status);
      }
    }
  }, [wards]);

  const flatBeds = useMemo(() => {
    const rows = wards.flatMap((ward) =>
      ward.beds.map((bed) => ({
        ward,
        bed,
        patient: bed.activeAdmission?.patient ?? null,
      })),
    );
    rows.sort((a, b) => {
      if (sortKey === "bed") {
        return a.bed.bedNumber.localeCompare(b.bed.bedNumber);
      }
      if (sortKey === "status") {
        return a.bed.status.localeCompare(b.bed.status);
      }
      return (
        a.ward.floor - b.ward.floor ||
        a.ward.name.localeCompare(b.ward.name) ||
        a.bed.bedNumber.localeCompare(b.bed.bedNumber)
      );
    });
    return rows;
  }, [wards, sortKey]);

  const availableBeds = useMemo(
    () =>
      wards.flatMap((w) =>
        w.beds
          .filter((b) => b.status === "AVAILABLE")
          .map((b) => ({ ...b, wardName: w.name })),
      ),
    [wards],
  );

  const admitMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admissions", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          bedId: admitBed!.id,
        }),
      }),
    onSuccess: () => {
      toast.success("Patient admitted");
      setAdmitOpen(false);
      setAdmitBed(null);
      setPatientId("");
      setPatientQuery("");
      setSelectedPatient(null);
      void queryClient.invalidateQueries({ queryKey: occupancyKey });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Admit failed");
    },
  });

  const dischargeMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admissions/${dischargeAdmission!.id}/discharge`, {
        method: "PATCH",
        body: JSON.stringify({
          dischargeSummary,
          medicationReconciled: medsAck,
          overrideReason: overrideReason.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Patient discharged");
      setDischargeAdmission(null);
      setDischargeSummary("");
      setMedsAck(false);
      setOverrideReason("");
      void queryClient.invalidateQueries({ queryKey: occupancyKey });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Discharge failed");
    },
  });

  const transferMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admissions/${transferAdmission!.id}/transfer`, {
        method: "PATCH",
        body: JSON.stringify({
          toBedId: transferToBedId,
          reason: transferReason,
        }),
      }),
    onSuccess: () => {
      toast.success("Patient transferred");
      setTransferAdmission(null);
      setTransferToBedId("");
      setTransferReason("");
      void queryClient.invalidateQueries({ queryKey: occupancyKey });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Transfer failed");
    },
  });

  function openAdmit(bed: Bed) {
    if (!canAdmit || bed.status !== "AVAILABLE") return;
    setAdmitBed(bed);
    setPatientId("");
    setPatientQuery("");
    setSelectedPatient(null);
    setAdmitOpen(true);
  }

  function openDischarge(admission: ActiveAdmission) {
    if (!canDischarge) return;
    setDischargeSummary("");
    setMedsAck(false);
    setOverrideReason("");
    setDischargeAdmission(admission);
  }

  function openTransfer(admission: ActiveAdmission) {
    if (!canTransfer) return;
    setTransferToBedId("");
    setTransferReason("");
    setTransferAdmission(admission);
  }

  const labsBlocking = checklist?.pendingLabResults.blocking ?? false;
  const canSubmitDischarge =
    medsAck &&
    dischargeSummary.trim().length > 0 &&
    (!labsBlocking || overrideReason.trim().length > 0);

  return (
    <PageEnter className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ward occupancy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live bed status across wards. Updates arrive in real time for connected staff.
          </p>
        </div>
        <div
          className="inline-flex rounded-md border border-border p-1"
          role="group"
          aria-label="Occupancy view"
        >
          <Button
            type="button"
            size="sm"
            variant={view === "grid" ? "default" : "ghost"}
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            Floor plan
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "list" ? "default" : "ghost"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            List view
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-hidden>
        {(Object.keys(STATUS_LABEL) as BedStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              className={cn("inline-block size-3 rounded-sm border", STATUS_STYLE[s])}
            />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} label="Loading occupancy…" />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : wards.length === 0 ? (
        <EmptyState
          title="No wards configured"
          description="Create wards under Hospital Configuration → Room & Ward Management."
        />
      ) : view === "grid" ? (
        <div ref={gridRef} className="space-y-8">
          {wards.map((ward) => (
            <section key={ward.id} aria-labelledby={`ward-${ward.id}`}>
              <h2 id={`ward-${ward.id}`} className="mb-3 text-lg font-medium">
                {ward.name}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  · Floor {ward.floor} · {ward.department.name}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {ward.beds.map((bed) => {
                  const patient = bed.activeAdmission?.patient;
                  const label = [
                    bed.bedNumber,
                    STATUS_LABEL[bed.status],
                    patient
                      ? `${patient.firstName} ${patient.lastName}, MRN ${patient.mrn}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(". ");

                  return (
                    <button
                      key={bed.id}
                      type="button"
                      data-bed-tile
                      ref={(el) => {
                        if (el) tileRefs.current.set(bed.id, el);
                        else tileRefs.current.delete(bed.id);
                      }}
                      aria-label={label}
                      onClick={() => {
                        if (bed.status === "AVAILABLE") openAdmit(bed);
                        else if (bed.activeAdmission) {
                          if (canDischarge) openDischarge(bed.activeAdmission);
                          else if (canTransfer) openTransfer(bed.activeAdmission);
                        }
                      }}
                      className={cn(
                        "flex min-h-[5.5rem] flex-col items-start justify-between rounded-md border p-3 text-left text-sm shadow-none transition-[transform] [transform-style:preserve-3d]",
                        STATUS_STYLE[bed.status],
                        bed.status === "AVAILABLE" && canAdmit
                          ? "cursor-pointer hover:brightness-95"
                          : bed.activeAdmission && (canDischarge || canTransfer)
                            ? "cursor-pointer hover:brightness-95"
                            : "cursor-default",
                      )}
                    >
                      <span className="font-semibold">{bed.bedNumber}</span>
                      <span className="text-xs opacity-80">{bed.bedType}</span>
                      {patient ? (
                        <span className="mt-1 line-clamp-2 text-xs font-medium">
                          {patient.firstName} {patient.lastName}
                        </span>
                      ) : (
                        <span className="mt-1 text-xs opacity-70">
                          {STATUS_LABEL[bed.status]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Label htmlFor="sort-beds" className="text-xs text-muted-foreground">
              Sort by
            </Label>
            <select
              id="sort-beds"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={sortKey}
              onChange={(e) =>
                setSortKey(e.target.value as "ward" | "bed" | "status")
              }
            >
              <option value="ward">Ward</option>
              <option value="bed">Bed number</option>
              <option value="status">Status</option>
            </select>
          </div>
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Ward
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Bed
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Patient
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {flatBeds.map(({ ward, bed, patient }) => (
                <tr key={bed.id} className="border-t border-border">
                  <td className="px-3 py-2">{ward.name}</td>
                  <td className="px-3 py-2 font-medium">{bed.bedNumber}</td>
                  <td className="px-3 py-2">{bed.bedType}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-block rounded-sm border px-1.5 py-0.5 text-xs",
                        STATUS_STYLE[bed.status],
                      )}
                    >
                      {STATUS_LABEL[bed.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {patient
                      ? `${patient.firstName} ${patient.lastName} (${patient.mrn})`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {canAdmit && bed.status === "AVAILABLE" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openAdmit(bed)}
                        >
                          Admit
                        </Button>
                      ) : null}
                      {canDischarge && bed.activeAdmission ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openDischarge(bed.activeAdmission!)}
                        >
                          Discharge
                        </Button>
                      ) : null}
                      {canTransfer && bed.activeAdmission ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openTransfer(bed.activeAdmission!)}
                        >
                          Transfer
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ActionDrawer
        open={admitOpen}
        onOpenChange={setAdmitOpen}
        icon={BedDouble}
        title={`Admit to ${admitBed?.bedNumber ?? "bed"}`}
        description="Search for a patient, then confirm admission to this bed."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setAdmitOpen(false)}
              disabled={admitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!patientId || !admitBed || admitMutation.isPending}
              onClick={() => admitMutation.mutate()}
            >
              {admitMutation.isPending ? "Admitting…" : "Confirm admission"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="patient-search">Patient</Label>
          <SearchInput
            id="patient-search"
            value={patientQuery}
            onChange={(e) => {
              const value = e.target.value;
              setPatientQuery(value);
              if (selectedPatient) {
                setSelectedPatient(null);
                setPatientId("");
              }
            }}
            placeholder="Search name or MRN…"
            autoComplete="off"
            isSearching={isTypeaheadBusy(patientQuery, {
              isFetching: patientSearchFetching,
            })}
          />
          {selectedPatient ? (
            <p className="text-xs text-muted-foreground">
              Admitting{" "}
              <span className="font-medium text-foreground">
                {selectedPatient.firstName} {selectedPatient.lastName} ·{" "}
                {selectedPatient.mrn}
              </span>
            </p>
          ) : null}
          {!selectedPatient && patientHits?.data?.length ? (
            <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
              {patientHits.data.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-muted/60",
                      patientId === p.id && "bg-primary/10",
                    )}
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientId(p.id);
                      setPatientQuery(`${p.firstName} ${p.lastName}`);
                    }}
                  >
                    {p.firstName} {p.lastName} · {p.mrn}
                  </button>
                </li>
              ))}
            </ul>
          ) : !selectedPatient &&
            patientQuery.trim().length >= 1 &&
            !patientSearchFetching ? (
            <p className="text-xs text-muted-foreground">No patients matched.</p>
          ) : null}
        </div>
      </ActionDrawer>

      <ActionDrawer
        open={Boolean(dischargeAdmission)}
        onOpenChange={(o) => !o && setDischargeAdmission(null)}
        icon={LogOut}
        title="Discharge checklist"
        description={
          dischargeAdmission
            ? `${dischargeAdmission.patient.firstName} ${dischargeAdmission.patient.lastName} · ${dischargeAdmission.patient.mrn}`
            : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDischargeAdmission(null)}
              disabled={dischargeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!canSubmitDischarge || dischargeMutation.isPending}
              onClick={() => dischargeMutation.mutate()}
            >
              {dischargeMutation.isPending ? "Discharging…" : "Confirm discharge"}
            </Button>
          </>
        }
      >
        {checklistLoading ? (
          <InlineLoader label="Loading checklist…" />
        ) : (
          <ul className="space-y-3 text-sm">
            <li
              className={cn(
                "rounded-md border px-3 py-2",
                labsBlocking
                  ? "border-warning/50 bg-warning/10"
                  : "border-border",
              )}
            >
              <p className="font-medium">Pending lab results</p>
              <p className="text-muted-foreground">
                {checklist?.pendingLabResults.count ?? 0} not yet resulted
                {labsBlocking ? " — blocking unless overridden" : ""}
              </p>
            </li>
            <li className="rounded-md border border-border px-3 py-2">
              <p className="font-medium">Outstanding invoice</p>
              <p className="text-muted-foreground">
                {checklist?.outstandingInvoice.note ?? "—"}
                {checklist?.outstandingInvoice.count
                  ? ` (${checklist.outstandingInvoice.count})`
                  : ""}
              </p>
            </li>
            <li className="rounded-md border border-border px-3 py-2">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={medsAck}
                  onChange={(e) => setMedsAck(e.target.checked)}
                />
                <span>
                  <span className="font-medium">Medication reconciliation</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Confirm meds reviewed before discharge
                  </span>
                </span>
              </label>
            </li>
          </ul>
        )}

        {labsBlocking ? (
          <div className="space-y-2">
            <Label htmlFor="override-reason">Override reason (required)</Label>
            <Input
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Why discharge with pending labs?"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="discharge-summary">Discharge summary</Label>
          <textarea
            id="discharge-summary"
            className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={dischargeSummary}
            onChange={(e) => setDischargeSummary(e.target.value)}
          />
        </div>
      </ActionDrawer>

      <ActionDrawer
        open={Boolean(transferAdmission)}
        onOpenChange={(o) => !o && setTransferAdmission(null)}
        icon={ArrowRightLeft}
        title="Transfer bed"
        description={
          transferAdmission
            ? `${transferAdmission.patient.firstName} ${transferAdmission.patient.lastName}`
            : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setTransferAdmission(null)}
              disabled={transferMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={
                !transferToBedId ||
                !transferReason.trim() ||
                transferMutation.isPending
              }
              onClick={() => transferMutation.mutate()}
            >
              {transferMutation.isPending ? "Transferring…" : "Confirm transfer"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="to-bed">Available bed</Label>
          <select
            id="to-bed"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={transferToBedId}
            onChange={(e) => setTransferToBedId(e.target.value)}
          >
            <option value="">Select bed…</option>
            {availableBeds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.wardName} · {b.bedNumber} ({b.bedType})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="transfer-reason">Reason</Label>
          <Input
            id="transfer-reason"
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
          />
        </div>
      </ActionDrawer>
    </PageEnter>
  );
}
