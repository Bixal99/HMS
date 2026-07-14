"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Tab =
  | "general"
  | "departments"
  | "symptom-categories"
  | "billing"
  | "notifications"
  | "users";

type SettingRow = { key: string; value: unknown };
type Department = { id: string; name: string; description: string | null };
type SymptomCategory = {
  id: string;
  name: string;
  description: string | null;
  suggestedDepartmentId: string;
  suggestedDepartment: { id: string; name: string };
};
type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  staff?: {
    employeeCode: string;
    designation: string;
    department: { id: string; name: string } | null;
  } | null;
};

const ROLES = [
  "ADMIN",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "PHARMACIST",
  "LAB_TECHNICIAN",
  "BILLING_OFFICER",
] as const;

function settingMap(rows: SettingRow[]) {
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function SettingsTabs({ embedded = false }: { embedded?: boolean }) {
  const qc = useQueryClient();
  const tablistId = useId();
  const [tab, setTab] = useState<Tab>("general");
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    onConfirm: () => void;
  } | null>(null);

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<{ data: SettingRow[] }>("/api/settings"),
  });
  const settings = settingMap(settingsData?.data ?? []);

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<{ data: Department[] }>("/api/departments"),
  });
  const departments = deptsData?.data ?? [];

  const { data: symptomCatsData } = useQuery({
    queryKey: ["symptom-categories"],
    queryFn: () =>
      apiFetch<{ data: SymptomCategory[] }>("/api/symptom-categories"),
    enabled: tab === "symptom-categories",
  });
  const symptomCategories = symptomCatsData?.data ?? [];

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<{ data: UserRow[] }>("/api/users"),
    enabled: tab === "users",
  });
  const users = usersData?.data ?? [];

  const putSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      apiFetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Save failed"),
  });

  async function saveSettingsBatch(
    entries: Array<{ key: string; value: unknown }>,
    successMessage = "Settings saved",
  ) {
    try {
      await Promise.all(
        entries.map(({ key, value }) =>
          apiFetch(`/api/settings/${encodeURIComponent(key)}`, {
            method: "PUT",
            body: JSON.stringify({ value }),
          }),
        ),
      );
      toast.success(successMessage);
      await qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  function normalizeBrandColor(raw: string): string | null {
    const trimmed = raw.trim();
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    return /^#([0-9a-fA-F]{6})$/.test(withHash) ? withHash : null;
  }

  const [general, setGeneral] = useState({
    name: "",
    address: "",
    logoUrl: "",
    brandColorHex: "#1a5cd6",
  });
  const [billing, setBilling] = useState({
    fee: "5000",
    surgeryFee: "150000",
    nursingDaily: "0",
    tax: "0",
    currency: "USD",
  });
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [editingDept, setEditingDept] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);
  const [symptomForm, setSymptomForm] = useState({
    name: "",
    description: "",
    suggestedDepartmentId: "",
  });
  const [editingSymptom, setEditingSymptom] = useState<{
    id: string;
    name: string;
    description: string;
    suggestedDepartmentId: string;
  } | null>(null);
  const [staffForm, setStaffForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "NURSE",
    employeeCode: "",
    departmentId: "",
    designation: "",
    specialization: "",
  });

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!settingsData || hydrated) return;
    setGeneral({
      name: String(settings["hospital.name"] ?? ""),
      address: String(settings["hospital.address"] ?? ""),
      logoUrl: String(settings["hospital.logoUrl"] ?? ""),
      brandColorHex: String(settings["hospital.brandColorHex"] ?? "#1a5cd6"),
    });
    setBilling({
      fee: String(settings["billing.consultationFeeCents"] ?? 5000),
      surgeryFee: String(settings["billing.defaultSurgeryFeeCents"] ?? 150000),
      nursingDaily: String(settings["billing.nursingDailyCents"] ?? 0),
      tax: String(settings["billing.taxRatePercent"] ?? 0),
      currency: String(settings["billing.currency"] ?? "USD"),
    });
    setHydrated(true);
  }, [settingsData, settings, hydrated]);

  const onKeyDownTabs = useCallback(
    (event: React.KeyboardEvent) => {
      const order: Tab[] = [
        "general",
        "departments",
        "symptom-categories",
        "billing",
        "notifications",
        "users",
      ];
      const idx = order.indexOf(tab);
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setTab(order[(idx + 1) % order.length]!);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setTab(order[(idx - 1 + order.length) % order.length]!);
      }
    },
    [tab],
  );

  const createDept = useMutation({
    mutationFn: () =>
      apiFetch("/api/departments", {
        method: "POST",
        body: JSON.stringify(deptForm),
      }),
    onSuccess: async () => {
      toast.success("Department created");
      setDeptForm({ name: "", description: "" });
      await qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create failed"),
  });

  const updateDept = useMutation({
    mutationFn: () => {
      if (!editingDept) throw new Error("No department");
      return apiFetch(`/api/departments/${editingDept.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingDept.name,
          description: editingDept.description || null,
        }),
      });
    },
    onSuccess: async () => {
      toast.success("Department updated");
      setEditingDept(null);
      await qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Update failed"),
  });

  const createSymptom = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/symptom-categories", {
        method: "POST",
        body: JSON.stringify({
          name: symptomForm.name,
          description: symptomForm.description || null,
          suggestedDepartmentId: symptomForm.suggestedDepartmentId,
        }),
      }),
    onSuccess: async () => {
      toast.success("Symptom category created");
      setSymptomForm({ name: "", description: "", suggestedDepartmentId: "" });
      await qc.invalidateQueries({ queryKey: ["symptom-categories"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create failed"),
  });

  const updateSymptom = useMutation({
    mutationFn: () => {
      if (!editingSymptom) throw new Error("No category");
      return apiFetch(`/api/admin/symptom-categories/${editingSymptom.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingSymptom.name,
          description: editingSymptom.description || null,
          suggestedDepartmentId: editingSymptom.suggestedDepartmentId,
        }),
      });
    },
    onSuccess: async () => {
      toast.success("Symptom category updated");
      setEditingSymptom(null);
      await qc.invalidateQueries({ queryKey: ["symptom-categories"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Update failed"),
  });

  const createStaff = useMutation({
    mutationFn: () =>
      apiFetch("/api/staff", {
        method: "POST",
        body: JSON.stringify({
          ...staffForm,
          specialization: staffForm.specialization || undefined,
        }),
      }),
    onSuccess: async () => {
      toast.success("Staff user created");
      setStaffForm({
        email: "",
        password: "",
        name: "",
        role: "NURSE",
        employeeCode: "",
        departmentId: "",
        designation: "",
        specialization: "",
      });
      await qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create failed"),
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "departments", label: "Departments" },
    { id: "symptom-categories", label: "Symptom categories" },
    { id: "billing", label: "Billing" },
    { id: "notifications", label: "Notifications" },
    { id: "users", label: "Users" },
  ];

  return (
    <div className="space-y-4">
      {embedded ? null : (
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Hospital configuration — Admin only.
          </p>
        </div>
      )}

      <div
        role="tablist"
        id={tablistId}
        aria-label="Settings sections"
        className="flex flex-wrap gap-1 border-b border-border"
        onKeyDown={onKeyDownTabs}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            className={`px-3 py-2 text-sm ${
              tab === t.id
                ? "border-b-2 border-primary font-medium text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hospital profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="h-name">Name</Label>
              <Input
                id="h-name"
                value={general.name}
                onChange={(e) => setGeneral((g) => ({ ...g, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="h-color">Brand color (PDF)</Label>
              <Input
                id="h-color"
                value={general.brandColorHex}
                placeholder="#1a5cd6"
                onChange={(e) =>
                  setGeneral((g) => ({ ...g, brandColorHex: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Use a 6-digit hex color like <code>#1a5cd6</code>
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="h-address">Address</Label>
              <Input
                id="h-address"
                value={general.address}
                onChange={(e) =>
                  setGeneral((g) => ({ ...g, address: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="h-logo">Logo URL</Label>
              <Input
                id="h-logo"
                value={general.logoUrl}
                onChange={(e) =>
                  setGeneral((g) => ({ ...g, logoUrl: e.target.value }))
                }
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                const brandColorHex = normalizeBrandColor(general.brandColorHex);
                if (!brandColorHex) {
                  toast.error("Brand color must be #RRGGBB (e.g. #1a5cd6)");
                  return;
                }
                if (brandColorHex !== general.brandColorHex.trim()) {
                  setGeneral((g) => ({ ...g, brandColorHex }));
                }
                void saveSettingsBatch([
                  { key: "hospital.name", value: general.name },
                  {
                    key: "hospital.address",
                    value: general.address || null,
                  },
                  {
                    key: "hospital.logoUrl",
                    value: general.logoUrl || null,
                  },
                  { key: "hospital.brandColorHex", value: brandColorHex },
                ]);
              }}
            >
              Save general
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "departments" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add department</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input
                placeholder="Name"
                value={deptForm.name}
                onChange={(e) =>
                  setDeptForm((d) => ({ ...d, name: e.target.value }))
                }
                className="max-w-xs"
              />
              <Input
                placeholder="Description"
                value={deptForm.description}
                onChange={(e) =>
                  setDeptForm((d) => ({ ...d, description: e.target.value }))
                }
                className="max-w-sm"
              />
              <Button
                type="button"
                disabled={!deptForm.name || createDept.isPending}
                onClick={() => createDept.mutate()}
              >
                Create
              </Button>
            </CardContent>
          </Card>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {departments.map((d) => (
              <li key={d.id} className="space-y-2 px-4 py-3 text-sm">
                {editingDept?.id === d.id ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={editingDept.name}
                      onChange={(e) =>
                        setEditingDept((cur) =>
                          cur ? { ...cur, name: e.target.value } : cur,
                        )
                      }
                      className="max-w-xs"
                    />
                    <Input
                      value={editingDept.description}
                      onChange={(e) =>
                        setEditingDept((cur) =>
                          cur ? { ...cur, description: e.target.value } : cur,
                        )
                      }
                      className="max-w-sm"
                      placeholder="Description"
                    />
                    <Button
                      size="sm"
                      type="button"
                      disabled={updateDept.isPending}
                      onClick={() => updateDept.mutate()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setEditingDept(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      {d.description ? (
                        <p className="text-muted-foreground">{d.description}</p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setEditingDept({
                          id: d.id,
                          name: d.name,
                          description: d.description ?? "",
                        })
                      }
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "symptom-categories" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add symptom category</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input
                placeholder="Name"
                value={symptomForm.name}
                onChange={(e) =>
                  setSymptomForm((s) => ({ ...s, name: e.target.value }))
                }
                className="max-w-xs"
              />
              <Input
                placeholder="Description"
                value={symptomForm.description}
                onChange={(e) =>
                  setSymptomForm((s) => ({ ...s, description: e.target.value }))
                }
                className="max-w-sm"
              />
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={symptomForm.suggestedDepartmentId}
                onChange={(e) =>
                  setSymptomForm((s) => ({
                    ...s,
                    suggestedDepartmentId: e.target.value,
                  }))
                }
              >
                <option value="">Suggested department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={
                  !symptomForm.name ||
                  !symptomForm.suggestedDepartmentId ||
                  createSymptom.isPending
                }
                onClick={() => createSymptom.mutate()}
              >
                Create
              </Button>
            </CardContent>
          </Card>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {symptomCategories.map((c) => (
              <li key={c.id} className="space-y-2 px-4 py-3 text-sm">
                {editingSymptom?.id === c.id ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={editingSymptom.name}
                      onChange={(e) =>
                        setEditingSymptom((cur) =>
                          cur ? { ...cur, name: e.target.value } : cur,
                        )
                      }
                      className="max-w-xs"
                    />
                    <Input
                      value={editingSymptom.description}
                      onChange={(e) =>
                        setEditingSymptom((cur) =>
                          cur ? { ...cur, description: e.target.value } : cur,
                        )
                      }
                      className="max-w-sm"
                      placeholder="Description"
                    />
                    <select
                      className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={editingSymptom.suggestedDepartmentId}
                      onChange={(e) =>
                        setEditingSymptom((cur) =>
                          cur
                            ? {
                                ...cur,
                                suggestedDepartmentId: e.target.value,
                              }
                            : cur,
                        )
                      }
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      type="button"
                      disabled={updateSymptom.isPending}
                      onClick={() => updateSymptom.mutate()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setEditingSymptom(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.description ? (
                        <p className="text-muted-foreground">{c.description}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Suggests: {c.suggestedDepartment.name}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setEditingSymptom({
                          id: c.id,
                          name: c.name,
                          description: c.description ?? "",
                          suggestedDepartmentId: c.suggestedDepartmentId,
                        })
                      }
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "billing" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="fee">Consultation fee (cents)</Label>
              <Input
                id="fee"
                type="number"
                value={billing.fee}
                onChange={(e) =>
                  setBilling((b) => ({ ...b, fee: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="surgery-fee">Default surgery fee (cents)</Label>
              <Input
                id="surgery-fee"
                type="number"
                value={billing.surgeryFee}
                onChange={(e) =>
                  setBilling((b) => ({ ...b, surgeryFee: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nursing-daily">Nursing daily (cents, 0 = off)</Label>
              <Input
                id="nursing-daily"
                type="number"
                value={billing.nursingDaily}
                onChange={(e) =>
                  setBilling((b) => ({ ...b, nursingDaily: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tax">Tax rate %</Label>
              <Input
                id="tax"
                type="number"
                value={billing.tax}
                onChange={(e) =>
                  setBilling((b) => ({ ...b, tax: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={billing.currency}
                onChange={(e) =>
                  setBilling((b) => ({ ...b, currency: e.target.value }))
                }
              />
            </div>
            <Button
              type="button"
              onClick={() =>
                setConfirm({
                  title: "Update billing settings?",
                  body: "This affects invoices generated after this change. Existing invoices are not modified.",
                  onConfirm: () => {
                    void saveSettingsBatch([
                      {
                        key: "billing.consultationFeeCents",
                        value: Number(billing.fee),
                      },
                      {
                        key: "billing.defaultSurgeryFeeCents",
                        value: Number(billing.surgeryFee),
                      },
                      {
                        key: "billing.nursingDailyCents",
                        value: Number(billing.nursingDaily),
                      },
                      {
                        key: "billing.taxRatePercent",
                        value: Number(billing.tax),
                      },
                      {
                        key: "billing.currency",
                        value: billing.currency,
                      },
                    ]);
                    setConfirm(null);
                  },
                })
              }
            >
              Save billing
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "notifications" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature toggles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                [
                  "features.patientSelfRegistration",
                  "Patient self-registration",
                ],
                ["features.appointmentWaitlist", "Appointment waitlist"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={(e) =>
                    putSetting.mutate(
                      { key, value: e.target.checked },
                      {
                        onSuccess: () => toast.success("Setting saved"),
                      },
                    )
                  }
                />
              </label>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {tab === "users" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Onboard staff</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["email", "Email"],
                  ["password", "Password"],
                  ["name", "Name"],
                  ["employeeCode", "Employee code"],
                  ["designation", "Designation"],
                  ["specialization", "Specialization"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`s-${field}`}>{label}</Label>
                  <Input
                    id={`s-${field}`}
                    type={field === "password" ? "password" : "text"}
                    value={staffForm[field]}
                    onChange={(e) =>
                      setStaffForm((f) => ({ ...f, [field]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label htmlFor="s-role">Role</Label>
                <select
                  id="s-role"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={staffForm.role}
                  onChange={(e) =>
                    setStaffForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-dept">Department</Label>
                <select
                  id="s-dept"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={staffForm.departmentId}
                  onChange={(e) =>
                    setStaffForm((f) => ({
                      ...f,
                      departmentId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                className="sm:col-span-2"
                disabled={createStaff.isPending}
                onClick={() => createStaff.mutate()}
              >
                Create staff user
              </Button>
            </CardContent>
          </Card>

          <ul className="divide-y divide-border rounded-lg border border-border">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {u.name || u.email}{" "}
                    <span className="text-muted-foreground">· {u.role}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {u.email}
                    {u.isActive ? "" : " · inactive"}
                    {u.staff?.department
                      ? ` · ${u.staff.department.name}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={u.role}
                    onChange={(e) => {
                      const role = e.target.value;
                      setConfirm({
                        title: "Change user role?",
                        body: `This will set ${u.email} to ${role}. Demoting the last Admin is blocked.`,
                        onConfirm: () => {
                          void apiFetch(`/api/users/${u.id}/role`, {
                            method: "PATCH",
                            body: JSON.stringify({ role }),
                          })
                            .then(async () => {
                              toast.success("Role updated");
                              await qc.invalidateQueries({
                                queryKey: ["users"],
                              });
                            })
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Update failed",
                              ),
                            );
                          setConfirm(null);
                        },
                      });
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setConfirm({
                        title: u.isActive
                          ? "Deactivate user?"
                          : "Reactivate user?",
                        body: u.isActive
                          ? `${u.email} will be unable to sign in until reactivated.`
                          : `${u.email} will be able to sign in again.`,
                        onConfirm: () => {
                          void apiFetch(`/api/users/${u.id}/status`, {
                            method: "PATCH",
                            body: JSON.stringify({ isActive: !u.isActive }),
                          })
                            .then(async () => {
                              toast.success("Status updated");
                              await qc.invalidateQueries({
                                queryKey: ["users"],
                              });
                            })
                            .catch((err) =>
                              toast.error(
                                err instanceof ApiError
                                  ? err.message
                                  : "Update failed",
                              ),
                            );
                          setConfirm(null);
                        },
                      })
                    }
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Drawer open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DrawerContent className="w-[min(24rem,94vw)]">
          <DrawerHeader>
            <DrawerTitle>{confirm?.title}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <p className="text-sm text-muted-foreground">{confirm?.body}</p>
            <div className="flex gap-2">
              <Button type="button" onClick={() => confirm?.onConfirm()}>
                Confirm
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
