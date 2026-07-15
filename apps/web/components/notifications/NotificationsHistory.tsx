"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { apiFetch } from "@/lib/api";
import {
  notificationBody,
  notificationHref,
} from "@/lib/notification-display";
import { PageEnter } from "@/components/shared/PageEnter";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { QueryErrorState } from "@/components/shared/QueryErrorState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  meta?: unknown;
  readAt: string | null;
  createdAt: string;
};

const PAGE_SIZE = 40;

export function NotificationsHistory({ role }: { role?: string }) {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["notifications-history", offset],
    queryFn: () =>
      apiFetch<{
        items: NotificationItem[];
        total: number;
        limit: number;
        offset: number;
      }>(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`),
  });

  const markAll = useMutation({
    mutationFn: () =>
      apiFetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <PageEnter>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Notification history
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} total · full inbox for your account
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        </div>

        {isLoading ? (
          <ListSkeleton rows={4} label="Loading notifications…" />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Alerts and handoffs will show up here when something needs your attention."
          />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((item) => {
              const body = notificationBody(item);
              const href = notificationHref(item, role);
              const content = (
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {!item.readAt ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                    <p
                      className={cn(
                        "truncate text-sm",
                        !item.readAt
                          ? "font-semibold text-foreground"
                          : "text-foreground",
                      )}
                    >
                      {item.title}
                    </p>
                  </div>
                  {body ? (
                    <p className="text-sm text-muted-foreground">{body}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                    {href ? " · Tap to open" : ""}
                  </p>
                </div>
              );

              return (
                <li key={item.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="block px-4 py-3 transition-colors hover:bg-muted/40"
                      onClick={() => {
                        if (!item.readAt) markOne.mutate(item.id);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      onClick={() => {
                        if (!item.readAt) markOne.mutate(item.id);
                      }}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrev || isFetching}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </Button>
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? "0"
              : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasMore || isFetching}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </PageEnter>
  );
}
