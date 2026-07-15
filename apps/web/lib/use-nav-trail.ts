"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  breadcrumbsFromPath,
  type BreadcrumbItem,
} from "@/lib/breadcrumbs";
import { homeForRole } from "@/lib/role-routes";

const MAX_TRAIL = 6;

function storageKey(role: string) {
  return `medicore.navTrail.${role}`;
}

function leafFromPath(pathname: string, role: string): BreadcrumbItem {
  const pathCrumbs = breadcrumbsFromPath(pathname, role);
  const last = pathCrumbs[pathCrumbs.length - 1];
  return {
    label: last?.label ?? "Page",
    href: pathname,
  };
}

function readStored(role: string): BreadcrumbItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(role));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BreadcrumbItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(role: string, trail: BreadcrumbItem[]) {
  try {
    sessionStorage.setItem(storageKey(role), JSON.stringify(trail));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Visit-order breadcrumbs: Dashboard → Staff → Billing, truncating when revisiting.
 * Falls back to Dashboard + current page on deep link / empty trail.
 */
export function useNavTrail(role: string): {
  crumbs: BreadcrumbItem[];
  onCrumbNavigate: (href: string, index: number) => void;
} {
  const pathname = usePathname();
  const router = useRouter();
  const home = homeForRole(role);

  const [trail, setTrail] = useState<BreadcrumbItem[]>(() => [
    { label: "Dashboard", href: home },
  ]);

  useEffect(() => {
    const stored = readStored(role);
    const dashboard: BreadcrumbItem = { label: "Dashboard", href: home };
    const leaf = leafFromPath(pathname, role);
    const isHome =
      pathname === home ||
      pathname === "/portal" ||
      /^\/dashboard\/[^/]+$/.test(pathname);

    setTrail((prev) => {
      const base =
        stored && stored.length > 0
          ? stored.map((c, i) =>
              i === 0 ? { ...c, label: "Dashboard", href: home } : c,
            )
          : prev[0]?.label === "Dashboard"
            ? prev
            : [dashboard];

      let next: BreadcrumbItem[];

      if (isHome) {
        next = [dashboard];
      } else {
        const existingIdx = base.findIndex((c) => c.href === pathname);
        if (existingIdx >= 0) {
          next = base.slice(0, existingIdx + 1).map((c, i, arr) =>
            i === arr.length - 1 ? { label: leaf.label, href: pathname } : c,
          );
        } else {
          const withoutCurrentHrefs = base.filter((c) => c.href !== pathname);
          next = [
            withoutCurrentHrefs[0]?.label === "Dashboard"
              ? withoutCurrentHrefs[0]!
              : dashboard,
            ...withoutCurrentHrefs.slice(1),
            { label: leaf.label, href: pathname },
          ];
          if (next.length > MAX_TRAIL) {
            next = [next[0]!, ...next.slice(-(MAX_TRAIL - 1))];
          }
        }
      }

      // Ensure dashboard first
      if (next[0]?.label !== "Dashboard") {
        next = [dashboard, ...next.filter((c) => c.href !== home)];
      }

      writeStored(role, next);
      return next;
    });
  }, [pathname, role, home]);

  const crumbs = useMemo(() => {
    return trail.map((c, i) =>
      i === trail.length - 1 ? { label: c.label } : { label: c.label, href: c.href },
    );
  }, [trail]);

  const onCrumbNavigate = useCallback(
    (href: string, index: number) => {
      setTrail((prev) => {
        const next = prev.slice(0, index + 1);
        writeStored(role, next);
        return next;
      });
      router.push(href);
    },
    [role, router],
  );

  return { crumbs, onCrumbNavigate };
}
