"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { API_BASE, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationCenter() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, countRes] = await Promise.all([
        apiFetch<{ items: NotificationItem[] }>("/api/notifications?limit=20"),
        apiFetch<{ count: number }>("/api/notifications/unread-count"),
      ]);
      setItems(list.items);
      setUnread(countRes.count);
    } catch {
      // Session may not be ready yet
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const socket: Socket = io(API_BASE, { withCredentials: true });
    socket.on("notification:new", () => {
      void refresh();
    });
    return () => {
      socket.disconnect();
    };
  }, [refresh]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function onMarkAll() {
    setUnread(0);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    );
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
    } finally {
      await refresh();
    }
  }

  async function onOpenItem(item: NotificationItem) {
    if (!item.readAt) {
      setUnread((n) => Math.max(0, n - 1));
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, readAt: new Date().toISOString() }
            : row,
        ),
      );
      await apiFetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => void onMarkAll()}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <div className="my-1 h-px bg-border" />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className={cn("cursor-pointer", !item.readAt && "bg-muted/40")}
              onSelect={(e) => {
                e.preventDefault();
                void onOpenItem(item).then(() => {
                  if (item.href) {
                    router.push(item.href);
                    setOpen(false);
                  }
                });
              }}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={cn(
                    "truncate text-sm",
                    !item.readAt ? "font-semibold text-foreground" : "text-foreground",
                  )}
                >
                  {item.title}
                </span>
                {item.body ? (
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {item.body}
                  </span>
                ) : null}
              </div>
            </DropdownMenuItem>
          ))
        )}
        <div className="my-1 h-px bg-border" />
        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="justify-center text-xs font-medium text-primary"
            onClick={() => setOpen(false)}
          >
            View all history
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
