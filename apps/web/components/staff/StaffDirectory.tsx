"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { apiFetch } from "@/lib/api";
import { staggerCards } from "@/lib/motion";
import { avatarToneClass, initialsFromName } from "@/lib/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageEnter } from "@/components/shared/PageEnter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

type StaffCard = {
  id: string;
  designation: string;
  specialization: string | null;
  availableToday: boolean;
  department: { id: string; name: string };
  user: { name: string | null; email: string; role: string };
};

type Department = { id: string; name: string };

export function StaffDirectory() {
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [specialization, setSpecialization] = useState<string>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<{ data: Department[] }>("/api/staff/departments"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["staff", departmentId, specialization],
    queryFn: () => {
      const params = new URLSearchParams();
      if (departmentId !== "all") params.set("departmentId", departmentId);
      if (specialization !== "all") params.set("specialization", specialization);
      const q = params.toString();
      return apiFetch<{ data: StaffCard[] }>(`/api/staff${q ? `?${q}` : ""}`);
    },
  });

  const specializations = useMemo(() => {
    const set = new Set<string>();
    for (const s of data?.data ?? []) {
      if (s.specialization) set.add(s.specialization);
    }
    return Array.from(set).sort();
  }, [data]);

  useGSAP(
    () => {
      if (!gridRef.current) return;
      const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-staff-card]");
      if (cards.length) staggerCards(cards);
    },
    { dependencies: [data?.data], scope: gridRef },
  );

  return (
    <PageEnter className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Staff directory</h1>
        <p className="text-sm text-muted-foreground">
          Filter by department and specialization
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="sm:max-w-xs" aria-label="Filter department">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departments?.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={specialization} onValueChange={setSpecialization}>
          <SelectTrigger className="sm:max-w-xs" aria-label="Filter specialization">
            <SelectValue placeholder="Specialization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All specializations</SelectItem>
            {specializations.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-shimmer rounded-lg bg-muted" />
          ))}
        </div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title="No staff found"
          description="Try adjusting filters or onboard staff from admin tools."
        />
      ) : (
        <div ref={gridRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data!.data.map((s) => {
            const name = s.user.name || s.user.email;
            return (
              <Card
                key={s.id}
                data-staff-card
                className="transition-transform duration-200 hover:scale-[1.02] hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full text-xs font-semibold",
                      avatarToneClass(name),
                    )}
                  >
                    {initialsFromName(name)}
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground">{name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{s.department.name}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {s.specialization ? (
                    <span className="inline-flex rounded-md bg-accent/15 px-2 py-0.5 text-xs text-accent-foreground">
                      {s.specialization}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{s.designation}</span>
                  )}
                  <p className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "inline-block size-2 rounded-full",
                        s.availableToday ? "bg-success" : "bg-muted-foreground/40",
                      )}
                      aria-hidden
                    />
                    <span className="text-foreground">
                      {s.availableToday ? "Available today" : "Not available now"}
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageEnter>
  );
}
