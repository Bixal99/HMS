"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Scan } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, API_BASE, ApiError } from "@/lib/api";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageEnter } from "@/components/shared/PageEnter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const COLUMNS = [
  { id: "ORDERED", label: "Ordered" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "COMPLETED", label: "Completed" },
] as const;

type Stage = (typeof COLUMNS)[number]["id"];

type RadItem = {
  id: string;
  status: string;
  modality: { id: string; name: string; code: string };
  report: {
    id: string;
    findings: string | null;
    impression: string | null;
    reportFileUrl: string | null;
    reportedAt: string;
  } | null;
};

type RadCard = {
  id: string;
  columnId: Stage;
  status: Stage;
  createdAt: string;
  patient: { firstName: string; lastName: string; mrn: string };
  items: RadItem[];
};

function ImagingCardBody({ order }: { order: RadCard }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="font-medium text-foreground">
          {order.patient.firstName} {order.patient.lastName}
        </p>
        <p className="text-xs text-muted-foreground">{order.patient.mrn}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {order.items.map((item) => (
          <span
            key={item.id}
            className="inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
          >
            {item.modality.code || item.modality.name}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>
          {order.items.length} stud{order.items.length === 1 ? "y" : "ies"}
        </span>
        <span>
          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export function ImagingQueueBoard({ role }: { role: string }) {
  const queryClient = useQueryClient();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["radiology-queue"],
    queryFn: () =>
      apiFetch<{ data: Record<string, Omit<RadCard, "columnId">[]> }>(
        "/api/radiology/orders/queue",
      ),
  });

  const cards: RadCard[] = [];
  if (data?.data) {
    for (const col of COLUMNS) {
      for (const order of data.data[col.id] ?? []) {
        cards.push({ ...order, columnId: col.id, status: col.id });
      }
    }
  }

  const detail = useQuery({
    queryKey: ["radiology-order", drawerId],
    enabled: Boolean(drawerId),
    queryFn: () => apiFetch<RadCard>(`/api/radiology/orders/${drawerId}`),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/radiology/orders/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["radiology-queue"] });
      const prev = queryClient.getQueryData<{
        data: Record<string, Omit<RadCard, "columnId">[]>;
      }>(["radiology-queue"]);
      if (prev?.data) {
        const next: Record<string, Omit<RadCard, "columnId">[]> = {
          ORDERED: [],
          IN_PROGRESS: [],
          COMPLETED: [],
        };
        let moved: Omit<RadCard, "columnId"> | null = null;
        for (const col of COLUMNS) {
          for (const order of prev.data[col.id] ?? []) {
            if (order.id === id) moved = { ...order, status };
            else next[col.id].push(order);
          }
        }
        if (moved && status in next) next[status as Stage].push(moved);
        queryClient.setQueryData(["radiology-queue"], { data: next });
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["radiology-queue"], ctx.prev);
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    },
    onSuccess: () => {
      toast.success("Stage updated");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["radiology-queue"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const form = new FormData();
      if (findings) form.append("findings", findings);
      if (impression) form.append("impression", impression);
      if (file) form.append("file", file);
      const res = await fetch(`${API_BASE}/api/radiology/reports/${itemId}`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(res.status, body.error ?? "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Report submitted");
      setFindings("");
      setImpression("");
      setFile(null);
      setActiveItemId(null);
      void queryClient.invalidateQueries({ queryKey: ["radiology-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["radiology-order", drawerId] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Report failed"),
  });

  return (
    <PageEnter>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Imaging queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag studies across stages. Open a card to upload reports.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : cards.length === 0 ? (
          <EmptyState
            icon={<Scan className="size-6 text-muted-foreground" />}
            title="No imaging orders yet"
            description="Orders appear here when doctors request radiology during a visit."
          />
        ) : (
          <KanbanBoard
            columns={[...COLUMNS]}
            items={cards}
            onMove={(id, to) => stageMutation.mutate({ id, status: to })}
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
                <ImagingCardBody order={order} />
              </button>
            )}
            renderOverlay={(order) => (
              <div className="w-72 rotate-1 rounded-lg border border-primary/40 bg-card p-3 shadow-xl">
                <ImagingCardBody order={order} />
              </div>
            )}
          />
        )}
      </div>

      <Drawer open={Boolean(drawerId)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Imaging order</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-auto px-4 pb-6">
            {detail.data ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {detail.data.patient.firstName} {detail.data.patient.lastName} ·{" "}
                  {detail.data.patient.mrn}
                </p>
                {role !== "DOCTOR" && detail.data.status === "ORDERED" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      stageMutation.mutate({ id: detail.data!.id, status: "IN_PROGRESS" })
                    }
                  >
                    Start study
                  </Button>
                ) : null}
                <ul className="space-y-3">
                  {detail.data.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-md border border-border bg-card p-3 text-sm"
                    >
                      <p className="font-medium text-foreground">{item.modality.name}</p>
                      <p className="text-xs text-muted-foreground">{item.status}</p>
                      {item.report ? (
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          {item.report.findings ? <p>Findings: {item.report.findings}</p> : null}
                          {item.report.impression ? (
                            <p>Impression: {item.report.impression}</p>
                          ) : null}
                          {item.report.reportFileUrl ? (
                            <a
                              className="text-primary underline"
                              href={`${API_BASE}${item.report.reportFileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open report file
                            </a>
                          ) : null}
                        </div>
                      ) : role !== "DOCTOR" && item.status !== "REPORTED" ? (
                        <div className="mt-3 space-y-2">
                          {activeItemId === item.id ? (
                            <>
                              <div className="space-y-1">
                                <Label htmlFor={`f-${item.id}`}>Findings</Label>
                                <Input
                                  id={`f-${item.id}`}
                                  value={findings}
                                  onChange={(e) => setFindings(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`i-${item.id}`}>Impression</Label>
                                <Input
                                  id={`i-${item.id}`}
                                  value={impression}
                                  onChange={(e) => setImpression(e.target.value)}
                                />
                              </div>
                              <Input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                              />
                              <Button
                                type="button"
                                disabled={reportMutation.isPending}
                                onClick={() => reportMutation.mutate(item.id)}
                              >
                                Submit report
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveItemId(item.id)}
                            >
                              Add report
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </PageEnter>
  );
}
