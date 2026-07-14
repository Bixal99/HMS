"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PatientListResponse } from "@/lib/patients";
import type { NavGroup } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

const PATIENT_SEARCH_ROLES = new Set([
  "ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "NURSE",
  "BILLING_OFFICER",
]);

type PortalSearchData = {
  quickActions: Array<{ id: string; label: string; href: string }>;
  appointments: Array<{ id: string; label: string; href: string }>;
  doctors: Array<{ id: string; label: string; subtitle?: string; href: string }>;
  departments: Array<{ id: string; label: string; href: string }>;
  records: Array<{ id: string; label: string; href: string }>;
};

type GlobalSearchProps = {
  role: string;
  navGroups: NavGroup[];
  className?: string;
};

export function GlobalSearch({ role, navGroups, className }: GlobalSearchProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced] = useDebounce(query.trim(), 300);

  const canSearchPatients = PATIENT_SEARCH_ROLES.has(role);
  const isPatientPortal = role === "PATIENT";

  const navItems = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ href: string; label: string; group: string }> = [];
    for (const group of navGroups) {
      for (const item of group.items) {
        if (seen.has(item.href)) continue;
        seen.add(item.href);
        items.push({ href: item.href, label: item.label, group: group.title });
      }
    }
    return items;
  }, [navGroups]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems.slice(0, 8);
    return navItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [navItems, query]);

  const patientsQ = useQuery({
    queryKey: ["global-search-patients", debounced],
    enabled: canSearchPatients && open && debounced.length >= 2,
    queryFn: () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "5",
        q: debounced,
      });
      return apiFetch<PatientListResponse>(`/api/patients?${params}`);
    },
  });

  const portalQ = useQuery({
    queryKey: ["portal-search", debounced],
    enabled: isPatientPortal && open,
    queryFn: () =>
      apiFetch<{ data: PortalSearchData }>(
        `/api/portal/search?q=${encodeURIComponent(debounced)}`,
      ),
  });

  const patients = patientsQ.data?.data ?? [];
  const portal = portalQ.data?.data;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const showPanel = open;

  return (
    <div ref={rootRef} className={cn("relative hidden sm:block", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={isPatientPortal ? "Search your care…" : "Search…"}
        aria-label="Search"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        autoComplete="off"
        className="h-9 w-52 rounded-md border border-input bg-background pl-8 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-64"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
        ⌘K
      </kbd>

      {showPanel ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-96 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          <div className="max-h-96 overflow-y-auto p-1">
            {isPatientPortal ? (
              <>
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick actions
                </p>
                {(portal?.quickActions ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => go(item.href)}
                  >
                    {item.label}
                  </button>
                ))}
                {(portal?.appointments?.length ?? 0) > 0 ? (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Appointments
                    </p>
                    {portal!.appointments.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => go(item.href)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </>
                ) : null}
                {(portal?.doctors?.length ?? 0) > 0 ? (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Doctors
                    </p>
                    {portal!.doctors.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full flex-col rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => go(item.href)}
                      >
                        <span>{item.label}</span>
                        {item.subtitle ? (
                          <span className="text-[11px] text-muted-foreground">{item.subtitle}</span>
                        ) : null}
                      </button>
                    ))}
                  </>
                ) : null}
                {(portal?.departments?.length ?? 0) > 0 ? (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Departments
                    </p>
                    {portal!.departments.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => go(item.href)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pages
                </p>
                {filteredNav.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-muted-foreground">No matching pages</p>
                ) : (
                  filteredNav.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      className="flex w-full flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => go(item.href)}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.group}
                      </span>
                    </button>
                  ))
                )}
                {canSearchPatients && debounced.length >= 2 ? (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Patients
                    </p>
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => go(`/patients/${p.id}`)}
                      >
                        <span className="font-medium">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">MRN {p.mrn}</span>
                      </button>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
