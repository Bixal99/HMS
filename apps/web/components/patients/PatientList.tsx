"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import type { Patient, PatientListResponse } from "@/lib/patients";
import { staggerCards } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";

const columnHelper = createColumnHelper<Patient>();

export function PatientList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const cardsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["patients", debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        q: debouncedSearch,
      });
      return apiFetch<PatientListResponse>(`/api/patients?${params}`);
    },
  });

  useEffect(() => {
    if (!cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll<HTMLElement>("[data-patient-card]");
    if (cards.length) staggerCards(cards);
  }, [data?.data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => `${row.lastName}, ${row.firstName}`, {
        id: "name",
        header: "Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("mrn", {
        header: "MRN",
        cell: (info) => (
          <span className="font-mono text-sm">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.display({
        id: "lastVisit",
        header: "Last Visit",
        cell: () => <span className="text-muted-foreground">—</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/patients/${row.original.id}`}>View</Link>
          </Button>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, phone, or MRN…"
          className="max-w-md"
          aria-label="Search patients"
        />
        <Button asChild>
          <Link href="/patients/new">Register Patient</Link>
        </Button>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {(error as Error).message || "Failed to load patients"}
        </p>
      ) : null}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-shimmer rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border transition-shadow last:border-0 hover:bg-muted/50 hover:shadow-md"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
            {!isLoading && (data?.data.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState
                    title="No patients found"
                    description="Try another search, or register a new patient."
                    actionLabel="Register Patient"
                    actionHref="/patients/new"
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — same query data */}
      <div ref={cardsRef} className="grid gap-3 md:hidden">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-shimmer rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-shimmer rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          : (data?.data ?? []).map((patient) => (
              <Card
                key={patient.id}
                data-patient-card
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground">
                    {patient.lastName}, {patient.firstName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 pt-0">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-mono">{patient.mrn}</p>
                    <p>{patient.phone ?? "—"}</p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/patients/${patient.id}`}>View</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>

      {data ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
