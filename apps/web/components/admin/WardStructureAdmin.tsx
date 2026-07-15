"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Department = { id: string; name: string };
type Bed = {
  id: string;
  wardId: string;
  bedNumber: string;
  bedType: string;
  dailyRateCents: number;
  status: string;
};
type Ward = {
  id: string;
  name: string;
  floor: number;
  departmentId: string;
  department: Department;
  beds: Bed[];
};

export function WardStructureAdmin() {
  const qc = useQueryClient();
  const [wardForm, setWardForm] = useState({
    name: "",
    departmentId: "",
    floor: "1",
  });
  const [bedForm, setBedForm] = useState({
    wardId: "",
    bedNumber: "",
    bedType: "General",
    dailyRateCents: "0",
  });
  const [editingWard, setEditingWard] = useState<{
    id: string;
    name: string;
    departmentId: string;
    floor: string;
  } | null>(null);

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<{ data: Department[] }>("/api/departments"),
  });
  const departments = deptsData?.data ?? [];

  const { data: wardsData } = useQuery({
    queryKey: ["wards-structure"],
    queryFn: () => apiFetch<{ data: Ward[] }>("/api/wards/structure"),
  });
  const wards = wardsData?.data ?? [];

  const createWard = useMutation({
    mutationFn: () =>
      apiFetch("/api/wards", {
        method: "POST",
        body: JSON.stringify({
          name: wardForm.name,
          departmentId: wardForm.departmentId,
          floor: Number(wardForm.floor),
        }),
      }),
    onSuccess: async () => {
      toast.success("Ward created");
      setWardForm({ name: "", departmentId: "", floor: "1" });
      await qc.invalidateQueries({ queryKey: ["wards-structure"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create failed"),
  });

  const updateWard = useMutation({
    mutationFn: () => {
      if (!editingWard) throw new Error("No ward");
      return apiFetch(`/api/wards/${editingWard.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingWard.name,
          departmentId: editingWard.departmentId,
          floor: Number(editingWard.floor),
        }),
      });
    },
    onSuccess: async () => {
      toast.success("Ward updated");
      setEditingWard(null);
      await qc.invalidateQueries({ queryKey: ["wards-structure"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Update failed"),
  });

  const createBed = useMutation({
    mutationFn: () =>
      apiFetch("/api/wards/beds", {
        method: "POST",
        body: JSON.stringify({
          wardId: bedForm.wardId,
          bedNumber: bedForm.bedNumber,
          bedType: bedForm.bedType,
          dailyRateCents: Number(bedForm.dailyRateCents),
        }),
      }),
    onSuccess: async () => {
      toast.success("Bed created");
      setBedForm((f) => ({ ...f, bedNumber: "" }));
      await qc.invalidateQueries({ queryKey: ["wards-structure"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create failed"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Room &amp; Ward Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Structural setup only. Live occupancy stays on the wards board.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add ward</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            placeholder="Name"
            className="max-w-xs"
            value={wardForm.name}
            onChange={(e) =>
              setWardForm((f) => ({ ...f, name: e.target.value }))
            }
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={wardForm.departmentId}
            onChange={(e) =>
              setWardForm((f) => ({ ...f, departmentId: e.target.value }))
            }
          >
            <option value="">Department…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Floor"
            className="w-24"
            value={wardForm.floor}
            onChange={(e) =>
              setWardForm((f) => ({ ...f, floor: e.target.value }))
            }
          />
          <Button
            type="button"
            disabled={
              !wardForm.name || !wardForm.departmentId || createWard.isPending
            }
            onClick={() => createWard.mutate()}
          >
            Create ward
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add bed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={bedForm.wardId}
            onChange={(e) =>
              setBedForm((f) => ({ ...f, wardId: e.target.value }))
            }
          >
            <option value="">Ward…</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Bed number"
            className="w-32"
            value={bedForm.bedNumber}
            onChange={(e) =>
              setBedForm((f) => ({ ...f, bedNumber: e.target.value }))
            }
          />
          <Input
            placeholder="Bed type"
            className="w-36"
            value={bedForm.bedType}
            onChange={(e) =>
              setBedForm((f) => ({ ...f, bedType: e.target.value }))
            }
          />
          <Input
            placeholder="Daily rate (cents)"
            className="w-40"
            value={bedForm.dailyRateCents}
            onChange={(e) =>
              setBedForm((f) => ({ ...f, dailyRateCents: e.target.value }))
            }
          />
          <Button
            type="button"
            disabled={
              !bedForm.wardId || !bedForm.bedNumber || createBed.isPending
            }
            onClick={() => createBed.mutate()}
          >
            Create bed
          </Button>
        </CardContent>
      </Card>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {wards.map((w) => (
          <li key={w.id} className="space-y-2 px-4 py-3 text-sm">
            {editingWard?.id === w.id ? (
              <div className="flex flex-wrap gap-2">
                <Input
                  value={editingWard.name}
                  onChange={(e) =>
                    setEditingWard((cur) =>
                      cur ? { ...cur, name: e.target.value } : cur,
                    )
                  }
                  className="max-w-xs"
                />
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={editingWard.departmentId}
                  onChange={(e) =>
                    setEditingWard((cur) =>
                      cur ? { ...cur, departmentId: e.target.value } : cur,
                    )
                  }
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <Input
                  className="w-24"
                  value={editingWard.floor}
                  onChange={(e) =>
                    setEditingWard((cur) =>
                      cur ? { ...cur, floor: e.target.value } : cur,
                    )
                  }
                />
                <Button
                  size="sm"
                  disabled={updateWard.isPending}
                  onClick={() => updateWard.mutate()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingWard(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {w.name}{" "}
                    <span className="text-muted-foreground">
                      · floor {w.floor} · {w.department.name}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {w.beds.length} bed{w.beds.length === 1 ? "" : "s"}
                    {w.beds.length
                      ? `: ${w.beds.map((b) => b.bedNumber).join(", ")}`
                      : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditingWard({
                      id: w.id,
                      name: w.name,
                      departmentId: w.departmentId,
                      floor: String(w.floor),
                    })
                  }
                >
                  Edit ward
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
