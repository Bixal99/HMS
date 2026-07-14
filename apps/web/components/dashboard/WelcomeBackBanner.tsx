"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

const AUTH_WELCOME_KEY = "medicore:auth-welcome";
const visitedKey = (userId: string) => `medicore:visited-dashboard:${userId}`;

type MeResponse = {
  id: string;
  email: string;
  name?: string | null;
};

type WelcomeBackBannerProps = {
  className?: string;
  fallbackName?: string | null;
};

type WelcomeMode = "back" | "new";

export function WelcomeBackBanner({
  className,
  fallbackName,
}: WelcomeBackBannerProps) {
  const [mode, setMode] = useState<WelcomeMode | null>(null);
  const [name, setName] = useState(fallbackName ?? "");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/health/me`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const me = (await res.json()) as MeResponse;
        if (cancelled) return;

        const display =
          me.name?.trim() ||
          fallbackName?.trim() ||
          me.email.split("@")[0] ||
          "there";
        setName(display);

        let authWelcome: string | null = null;
        try {
          authWelcome = sessionStorage.getItem(AUTH_WELCOME_KEY);
          sessionStorage.removeItem(AUTH_WELCOME_KEY);
        } catch {
          authWelcome = null;
        }

        const key = visitedKey(me.id);
        const visitedBefore = Boolean(localStorage.getItem(key));
        localStorage.setItem(key, new Date().toISOString());

        if (authWelcome === "new") {
          setMode("new");
          return;
        }

        if (authWelcome === "back" || visitedBefore) {
          setMode("back");
          return;
        }

        setMode("back");
      } catch {
        // Banner is non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallbackName]);

  if (!mode) return null;

  const greeting = mode === "new" ? "Welcome" : "Welcome back";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-gradient-to-r from-card to-muted/40 px-5 py-5 text-left md:px-6 md:py-6",
        className,
      )}
    >
      <h2 className="text-3xl uppercase tracking-wide text-foreground md:text-4xl lg:text-5xl">
        <span className="font-normal">{greeting}</span>{" "}
        <span className="font-semibold">{name}</span>
      </h2>
    </div>
  );
}
