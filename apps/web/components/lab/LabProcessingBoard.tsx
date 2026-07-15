"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { apiFetch, API_BASE, ApiError } from "@/lib/api";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { PageEnter } from "@/components/shared/PageEnter";
import { BoardSkeleton } from "@/components/shared/BoardSkeleton";
import { InlineLoader } from "@/components/shared/InlineLoader";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "ORDERED", label: "Ordered" },
  { id: "COLLECTED", label: "Collected" },
  { id: "IN_PROGRESS", label: "Processing" },
  { id: "COMPLETED", label: "Completed" },
] as const;

type Stage = (typeof COLUMNS)[number]["id"];

type LabItem = {
  id: string;
  status: string;
  test: {
    id: string;
    name: string;
    resultType: "NUMERIC" | "TEXT" | "FILE";
    unit: string | null;
    referenceLow: number | null;
    referenceHigh: number | null;
    criticalLow: number | null;
    criticalHigh: number | null;
  };
  result: {
    id: string;
    isCritical: boolean;
    verifiedAt: string | null;
    resultValueNumeric: number | null;
    resultValueText: string | null;
    resultFileUrl: string | null;
  } | null;
};

type LabCard = {
  id: string;
  columnId: Stage;
  status: Stage;
  createdAt: string;
  patient: { firstName: string; lastName: string; mrn: string };
  items: LabItem[];
};

function rangeBadge(
  value: number | null,
  low: number | null,
  high: number | null,
): { label: string; className: string } | null {
  if (value == null || (low == null && high == null)) return null;
  if (low != null && value < low) {
    return { label: "Low", className: "bg-amber-100 text-amber-900" };
  }
  if (high != null && value > high) {
    return { label: "High", className: "bg-orange-100 text-orange-900" };
  }
  return { label: "Normal", className: "bg-emerald-100 text-emerald-900" };
}

export function LabProcessingBoard({ role }: { role: string }) {
  const queryClient = useQueryClient();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [criticalBanner, setCriticalBanner] = useState<string | null>(null);
  const [numericValues, setNumericValues] = useState<Record<string, string>>({});
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, { file: File; url: string }>>(
    {},
  );
  const [manualCritical, setManualCritical] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["lab-queue"],
    queryFn: async () => {
      const res = await apiFetch<{ data: Record<Stage, Omit<LabCard, "columnId">[]> }>(
        "/api/lab/orders/queue",
      );
      const flat: LabCard[] = [];
      for (const stage of COLUMNS.map((c) => c.id)) {
        for (const order of res.data[stage] ?? []) {
          flat.push({ ...order, columnId: stage, status: stage });
        }
      }
      return flat;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ["lab-order", drawerId],
    enabled: Boolean(drawerId),
    queryFn: () => apiFetch<LabCard>(`/api/lab/orders/${drawerId}`),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Stage }) =>
      apiFetch(`/api/lab/orders/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["lab-queue"] }),
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Stage update failed"),
  });

  const submitMutation = useMutation({
    mutationFn: async (item: LabItem) => {
      const form = new FormData();
      if (item.test.resultType === "NUMERIC") {
        form.append("resultValueNumeric", numericValues[item.id] ?? "");
      }
      if (item.test.resultType === "TEXT") {
        form.append("resultValueText", textValues[item.id] ?? "");
      }
      if (item.test.resultType === "FILE" && filePreviews[item.id]) {
        form.append("file", filePreviews[item.id]!.file);
      }
      if (manualCritical[item.id]) form.append("manualCriticalFlag", "true");

      const res = await fetch(`${API_BASE}/api/lab/results/${item.id}`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(res.status, body.error ?? res.statusText);
      }
      return res.json() as Promise<{ isCritical: boolean; testName: string }>;
    },
    onSuccess: (result) => {
      if (result.isCritical) {
        setCriticalBanner(
          `This result (${result.testName}) is flagged as critical — the ordering doctor has been notified`,
        );
      } else {
        toast.success("Result submitted");
      }
      void queryClient.invalidateQueries({ queryKey: ["lab-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["lab-order", drawerId] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Submit failed"),
  });

  const verifyMutation = useMutation({
    mutationFn: (resultId: string) =>
      apiFetch(`/api/lab/results/${resultId}/verify`, {
        method: "PATCH",
        body: "{}",
      }),
    onSuccess: () => {
      toast.success("Result verified");
      void queryClient.invalidateQueries({ queryKey: ["lab-order", drawerId] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Verify failed"),
  });

  const activeDetail = useMemo(() => {
    if (detail) return { ...detail, columnId: detail.status };
    return null;
  }, [detail]);

  return (
    <PageEnter>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Lab processing queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Collect samples, enter results, and complete orders.
          </p>
        </div>

        {criticalBanner ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive"
          >
            <p className="font-semibold">Critical value</p>
            <p className="mt-1 text-sm">{criticalBanner}</p>
            <Button
              type="button"
              className="mt-3"
              variant="destructive"
              onClick={() => setCriticalBanner(null)}
            >
              Continue
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <BoardSkeleton columns={4} label="Loading lab queue…" />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No lab orders"
            description="Orders appear here when doctors request tests during a visit."
          />
        ) : (
          <KanbanBoard
            columns={[...COLUMNS]}
            items={data}
            onMove={(id, to) => stageMutation.mutate({ id, status: to as Stage })}
            onCardOpen={(item) => setDrawerId(item.id)}
            renderCard={(order, { open }) => (
              <button
                type="button"
                className="w-full text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
              >
                <p className="font-medium text-foreground">
                  {order.patient.firstName} {order.patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{order.patient.mrn}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.items.length} test{order.items.length === 1 ? "" : "s"} ·{" "}
                  {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                </p>
              </button>
            )}
            renderOverlay={(order) => (
              <div className="w-72 rotate-1 rounded-lg border border-primary/40 bg-card p-3 shadow-xl">
                <p className="font-medium">
                  {order.patient.firstName} {order.patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.items.length} test{order.items.length === 1 ? "" : "s"}
                </p>
              </div>
            )}
          />
        )}
      </div>

      <ActionDrawer
        open={Boolean(drawerId)}
        onOpenChange={(o) => !o && setDrawerId(null)}
        title={
          activeDetail
            ? `${activeDetail.patient.firstName} ${activeDetail.patient.lastName}`
            : "Lab order"
        }
        description={activeDetail ? `Status: ${activeDetail.status}` : undefined}
        widthClass="w-[min(32rem,94vw)]"
        footer={
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setDrawerId(null)}
          >
            Close
          </Button>
        }
      >
            {!activeDetail ? (
              <InlineLoader label="Loading order…" />
            ) : (
              <>
                {activeDetail.status === "ORDERED" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      stageMutation.mutate({ id: activeDetail.id, status: "COLLECTED" })
                    }
                  >
                    Mark samples collected
                  </Button>
                ) : null}
                {activeDetail.items.map((item) => {
                  const num = numericValues[item.id]
                    ? Number(numericValues[item.id])
                    : null;
                  const badge = rangeBadge(
                    Number.isFinite(num) ? num : null,
                    item.test.referenceLow,
                    item.test.referenceHigh,
                  );
                  return (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-md border border-border p-3"
                    >
                      <p className="font-medium text-foreground">{item.test.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.test.resultType} · item {item.status}
                        {item.result?.isCritical ? " · CRITICAL" : ""}
                      </p>

                      {item.result ? (
                        <div className="space-y-2 text-sm">
                          <p>
                            Result:{" "}
                            {item.result.resultValueNumeric ??
                              item.result.resultValueText ??
                              (item.result.resultFileUrl ? "File uploaded" : "—")}
                          </p>
                          {item.result.resultFileUrl ? (
                            <a
                              className="text-primary underline"
                              href={`${API_BASE}${item.result.resultFileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open file
                            </a>
                          ) : null}
                          {role === "ADMIN" && !item.result.verifiedAt ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => verifyMutation.mutate(item.result!.id)}
                            >
                              Verify / sign off
                            </Button>
                          ) : item.result.verifiedAt ? (
                            <p className="text-xs text-muted-foreground">Verified</p>
                          ) : null}
                        </div>
                      ) : (
                        <form
                          className="space-y-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            submitMutation.mutate(item);
                          }}
                        >
                          {item.test.resultType === "NUMERIC" ? (
                            <div className="space-y-1">
                              <Label htmlFor={`num-${item.id}`}>
                                Value {item.test.unit ? `(${item.test.unit})` : ""}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id={`num-${item.id}`}
                                  type="number"
                                  step="any"
                                  value={numericValues[item.id] ?? ""}
                                  onChange={(e) =>
                                    setNumericValues((p) => ({
                                      ...p,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  required
                                />
                                {badge ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
                                      badge.className,
                                    )}
                                  >
                                    <span aria-hidden>
                                      {badge.label === "Normal"
                                        ? "●"
                                        : badge.label === "High"
                                          ? "▲"
                                          : "▼"}
                                    </span>
                                    {badge.label}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          {item.test.resultType === "TEXT" ? (
                            <div>
                              <Label htmlFor={`txt-${item.id}`}>Result text</Label>
                              <textarea
                                id={`txt-${item.id}`}
                                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={textValues[item.id] ?? ""}
                                onChange={(e) =>
                                  setTextValues((p) => ({ ...p, [item.id]: e.target.value }))
                                }
                                required
                              />
                            </div>
                          ) : null}
                          {item.test.resultType === "FILE" ? (
                            <div className="space-y-2">
                              <Label htmlFor={`file-${item.id}`}>Upload result file</Label>
                              <Input
                                id={`file-${item.id}`}
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const url = URL.createObjectURL(file);
                                  setFilePreviews((p) => ({
                                    ...p,
                                    [item.id]: { file, url },
                                  }));
                                }}
                                required
                              />
                              {filePreviews[item.id] ? (
                                filePreviews[item.id]!.file.type.startsWith("image/") ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={filePreviews[item.id]!.url}
                                    alt="Result preview"
                                    className="max-h-40 rounded border border-border"
                                  />
                                ) : (
                                  <iframe
                                    title="PDF preview"
                                    src={filePreviews[item.id]!.url}
                                    className="h-40 w-full rounded border border-border"
                                  />
                                )
                              ) : null}
                            </div>
                          ) : null}
                          {(item.test.resultType === "TEXT" ||
                            item.test.resultType === "FILE") && (
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={Boolean(manualCritical[item.id])}
                                onChange={(e) =>
                                  setManualCritical((p) => ({
                                    ...p,
                                    [item.id]: e.target.checked,
                                  }))
                                }
                              />
                              Flag as critical manually
                            </label>
                          )}
                          <Button type="submit" disabled={submitMutation.isPending}>
                            Submit result
                          </Button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </>
            )}
      </ActionDrawer>
    </PageEnter>
  );
}
