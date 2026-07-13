"use client";

import { Fragment, Suspense, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AuditLog = {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
};

type AuditLogResponse = {
  data: AuditLog[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type DiffLine = {
  kind: "added" | "removed";
  key: string;
  value: unknown;
};

const RESOURCE_TYPES = [
  "Patient",
  "Encounter",
  "Prescription",
  "Invoice",
  "Payment",
  "User",
  "Admission",
  "LabResult",
] as const;

function asObject(snapshot: unknown): Record<string, unknown> {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    return snapshot as Record<string, unknown>;
  }
  return snapshot === null || snapshot === undefined ? {} : { value: snapshot };
}

function diffSnapshots(before: unknown, after: unknown): DiffLine[] {
  const beforeObject = asObject(before);
  const afterObject = asObject(after);
  const keys = [...new Set([...Object.keys(beforeObject), ...Object.keys(afterObject)])].sort();
  const lines: DiffLine[] = [];

  for (const key of keys) {
    const hasBefore = Object.hasOwn(beforeObject, key);
    const hasAfter = Object.hasOwn(afterObject, key);
    const beforeValue = beforeObject[key];
    const afterValue = afterObject[key];

    if (hasBefore && (!hasAfter || JSON.stringify(beforeValue) !== JSON.stringify(afterValue))) {
      lines.push({ kind: "removed", key, value: beforeValue });
    }
    if (hasAfter && (!hasBefore || JSON.stringify(beforeValue) !== JSON.stringify(afterValue))) {
      lines.push({ kind: "added", key, value: afterValue });
    }
  }

  return lines;
}

function displayValue(value: unknown) {
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

function SnapshotDiff({ log }: { log: AuditLog }) {
  if (log.beforeJson == null && log.afterJson == null) {
    return <p className="text-sm text-muted-foreground">No snapshot</p>;
  }

  const lines = diffSnapshots(log.beforeJson, log.afterJson);
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">No field changes</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background font-mono text-xs">
      {lines.map((line, index) => {
        const added = line.kind === "added";
        return (
          <div
            key={`${line.kind}-${line.key}-${index}`}
            className={
              added
                ? "border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 last:border-b-0 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-b border-red-200 bg-red-50 px-3 py-2 text-red-800 last:border-b-0 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
            }
          >
            <span className="mr-2 inline-block w-3 select-none font-bold">
              {added ? "+" : "-"}
            </span>
            <span className="font-semibold">{line.key}</span>
            <span>: {displayValue(line.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function AuditLogViewerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const resourceType = searchParams.get("resourceType") ?? "";
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());

  const replaceParams = useCallback(
    (updates: Record<string, string>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (resetPage) params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const query = new URLSearchParams({
    page: String(page),
    pageSize: "20",
  });
  if (userId) query.set("userId", userId);
  if (resourceType) query.set("resourceType", resourceType);
  if (start) query.set("start", start);
  if (end) query.set("end", end);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit-logs", userId, resourceType, start, end, page],
    queryFn: () => apiFetch<AuditLogResponse>(`/api/audit-logs?${query.toString()}`),
  });

  const commitActor = (value: string) => {
    const nextValue = value.trim();
    if (nextValue !== userId) replaceParams({ userId: nextValue });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Security ledger
        </p>
        <h1 className="text-2xl font-semibold text-foreground">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Review who changed clinical and administrative records, and when.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_12rem_11rem_11rem_auto] xl:items-end">
        <div className="space-y-1">
          <Label htmlFor="audit-user">Actor user ID</Label>
          <Input
            key={userId}
            id="audit-user"
            defaultValue={userId}
            onBlur={(event) => commitActor(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitActor(event.currentTarget.value);
                event.currentTarget.blur();
              }
            }}
            placeholder="UUID, or leave blank"
            className="font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-resource">Resource</Label>
          <Select
            value={resourceType || "all"}
            onValueChange={(value) =>
              replaceParams({ resourceType: value === "all" ? "" : value })
            }
          >
            <SelectTrigger id="audit-resource">
              <SelectValue placeholder="All resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resources</SelectItem>
              {RESOURCE_TYPES.map((resource) => (
                <SelectItem key={resource} value={resource}>
                  {resource}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-start">Start</Label>
          <Input
            id="audit-start"
            type="date"
            value={start}
            onChange={(event) => replaceParams({ start: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-end">End</Label>
          <Input
            id="audit-end"
            type="date"
            value={end}
            onChange={(event) => replaceParams({ end: event.target.value })}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.replace(pathname, { scroll: false })}
          disabled={!userId && !resourceType && !start && !end}
        >
          Clear filters
        </Button>
      </div>

      {isError ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">Audit logs could not be loaded.</p>
          <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border bg-muted/70 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-10 px-2 py-3">
                <span className="sr-only">Details</span>
              </th>
              <th className="px-3 py-3 font-medium">Time</th>
              <th className="px-3 py-3 font-medium">Actor</th>
              <th className="px-3 py-3 font-medium">Action</th>
              <th className="px-3 py-3 font-medium">Resource</th>
              <th className="px-3 py-3 font-medium">Resource ID</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 7 }).map((_, row) => (
                  <tr key={row} className="border-b border-border last:border-b-0">
                    {Array.from({ length: 6 }).map((__, column) => (
                      <td key={column} className="px-3 py-3">
                        <div className="h-4 animate-shimmer rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : (data?.data ?? []).map((log) => {
                  const expanded = expandedRows.has(log.id);
                  return (
                    <Fragment key={log.id}>
                      <tr className="border-b border-border bg-background hover:bg-muted/40">
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-expanded={expanded}
                            aria-controls={`audit-diff-${log.id}`}
                            aria-label={`${expanded ? "Collapse" : "Expand"} changes for ${log.resourceType} ${log.resourceId ?? ""}`}
                            onClick={() => toggleRow(log.id)}
                          >
                            {expanded ? <ChevronDown /> : <ChevronRight />}
                          </Button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(log.createdAt))}
                        </td>
                        <td className="max-w-56 truncate px-3 py-2" title={log.user?.email ?? log.userId ?? "System"}>
                          {log.user?.email ?? log.userId ?? "System"}
                        </td>
                        <td className="px-3 py-2">
                          <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">{log.resourceType}</td>
                        <td className="max-w-56 truncate px-3 py-2 font-mono text-xs text-muted-foreground" title={log.resourceId ?? undefined}>
                          {log.resourceId ?? "—"}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr id={`audit-diff-${log.id}`} className="border-b border-border bg-muted/20">
                          <td colSpan={6} className="px-4 py-4">
                            <SnapshotDiff log={log} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
            {!isLoading && !isError && (data?.data.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="font-medium text-foreground">No audit events found</p>
                  <p className="text-sm text-muted-foreground">
                    Clear or broaden the filters to review more activity.
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} events)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => replaceParams({ page: String(page - 1) }, false)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => replaceParams({ page: String(page + 1) }, false)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AuditLogViewer() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-16 w-80 animate-shimmer rounded bg-muted" />
          <div className="h-28 animate-shimmer rounded-lg bg-muted" />
          <div className="h-80 animate-shimmer rounded-lg bg-muted" />
        </div>
      }
    >
      <AuditLogViewerInner />
    </Suspense>
  );
}
