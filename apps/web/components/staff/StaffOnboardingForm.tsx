"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Department = { id: string; name: string; description: string | null };
type Specialty = { id: string; name: string; description: string | null };
type Ward = { id: string; name: string; floor: number };

const ROLES = [
  "ADMIN",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "PHARMACIST",
  "LAB_TECHNICIAN",
  "BILLING_OFFICER",
] as const;

type Role = (typeof ROLES)[number];

type StaffFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  employeeCode: string;
  departmentId: string;
  designation: string;
  specialtyId: string;
  licenseNumber: string;
  qualification: string;
  experienceYears: string;
  consultationRoom: string;
  consultationFeeCents: string;
  wardId: string;
  shiftPattern: string;
};

const emptyForm: StaffFormState = {
  firstName: "",
  lastName: "",
  email: "",
  role: "NURSE",
  employeeCode: "",
  departmentId: "",
  designation: "",
  specialtyId: "",
  licenseNumber: "",
  qualification: "",
  experienceYears: "",
  consultationRoom: "",
  consultationFeeCents: "",
  wardId: "",
  shiftPattern: "",
};

function buildPayload(form: StaffFormState) {
  const name = `${form.firstName} ${form.lastName}`.trim();
  const base = {
    name,
    email: form.email,
    role: form.role,
    employeeCode: form.employeeCode,
    departmentId: form.departmentId,
    designation: form.designation,
  };

  switch (form.role) {
    case "DOCTOR":
      return {
        ...base,
        specialtyId: form.specialtyId,
        licenseNumber: form.licenseNumber,
        qualification: form.qualification,
        experienceYears: Number(form.experienceYears),
        ...(form.consultationRoom
          ? { consultationRoom: form.consultationRoom }
          : {}),
        ...(form.consultationFeeCents
          ? { consultationFeeCents: Number(form.consultationFeeCents) }
          : {}),
      };
    case "NURSE":
      return {
        ...base,
        wardId: form.wardId,
        shiftPattern: form.shiftPattern,
      };
    case "RECEPTIONIST":
      return { ...base, shiftPattern: form.shiftPattern };
    case "PHARMACIST":
      return { ...base, licenseNumber: form.licenseNumber };
    case "LAB_TECHNICIAN":
      return { ...base, qualification: form.qualification };
    default:
      return base;
  }
}

export function StaffOnboardingForm({
  departments,
  defaultConsultationFeeCents,
}: {
  departments: Department[];
  defaultConsultationFeeCents?: number;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<StaffFormState>(emptyForm);

  const { data: specialtiesData } = useQuery({
    queryKey: ["specialties"],
    queryFn: () => apiFetch<{ data: Specialty[] }>("/api/specialties"),
  });
  const specialties = specialtiesData?.data ?? [];

  const { data: wardsData } = useQuery({
    queryKey: ["wards-structure"],
    queryFn: () => apiFetch<{ data: Ward[] }>("/api/wards/structure"),
    enabled: form.role === "NURSE",
  });
  const wards = wardsData?.data ?? [];

  const createStaff = useMutation({
    mutationFn: () =>
      apiFetch("/api/staff", {
        method: "POST",
        body: JSON.stringify(buildPayload(form)),
      }),
    onSuccess: async () => {
      toast.success("Staff invited — they'll receive an email to set a password");
      setForm({ ...emptyForm, role: form.role });
      await qc.invalidateQueries({ queryKey: ["users"] });
      await qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Create failed"),
  });

  function set<K extends keyof StaffFormState>(key: K, value: StaffFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const feePlaceholder =
    defaultConsultationFeeCents != null
      ? String(defaultConsultationFeeCents)
      : "Hospital default";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Onboard staff</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="s-role">Role</Label>
          <select
            id="s-role"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.role}
            onChange={(e) => set("role", e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="s-first">First name</Label>
          <Input
            id="s-first"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-last">Last name</Label>
          <Input
            id="s-last"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-email">Email</Label>
          <Input
            id="s-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-code">Employee code</Label>
          <Input
            id="s-code"
            value={form.employeeCode}
            onChange={(e) => set("employeeCode", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-designation">Designation</Label>
          <Input
            id="s-designation"
            value={form.designation}
            onChange={(e) => set("designation", e.target.value)}
            placeholder="e.g. Senior Consultant"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s-dept">Department</Label>
          <select
            id="s-dept"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.departmentId}
            onChange={(e) => set("departmentId", e.target.value)}
          >
            <option value="">Select…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {form.role === "DOCTOR" ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="s-specialty">Specialty</Label>
              <select
                id="s-specialty"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.specialtyId}
                onChange={(e) => set("specialtyId", e.target.value)}
              >
                <option value="">Select…</option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-license">License number</Label>
              <Input
                id="s-license"
                value={form.licenseNumber}
                onChange={(e) => set("licenseNumber", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-qual">Qualification</Label>
              <Input
                id="s-qual"
                value={form.qualification}
                onChange={(e) => set("qualification", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-exp">Experience (years)</Label>
              <Input
                id="s-exp"
                type="number"
                min={1}
                value={form.experienceYears}
                onChange={(e) => set("experienceYears", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-room">Consultation room (optional)</Label>
              <Input
                id="s-room"
                value={form.consultationRoom}
                onChange={(e) => set("consultationRoom", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-fee">Consultation fee (cents, optional)</Label>
              <Input
                id="s-fee"
                type="number"
                min={1}
                placeholder={`Blank = hospital default (${feePlaceholder})`}
                value={form.consultationFeeCents}
                onChange={(e) => set("consultationFeeCents", e.target.value)}
              />
            </div>
          </>
        ) : null}

        {form.role === "NURSE" ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="s-ward">Ward</Label>
              <select
                id="s-ward"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.wardId}
                onChange={(e) => set("wardId", e.target.value)}
              >
                <option value="">Select…</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (floor {w.floor})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-shift">Shift pattern</Label>
              <Input
                id="s-shift"
                value={form.shiftPattern}
                onChange={(e) => set("shiftPattern", e.target.value)}
                placeholder="e.g. Day / Night"
              />
            </div>
          </>
        ) : null}

        {form.role === "RECEPTIONIST" ? (
          <div className="space-y-1">
            <Label htmlFor="s-shift-r">Shift pattern</Label>
            <Input
              id="s-shift-r"
              value={form.shiftPattern}
              onChange={(e) => set("shiftPattern", e.target.value)}
            />
          </div>
        ) : null}

        {form.role === "PHARMACIST" ? (
          <div className="space-y-1">
            <Label htmlFor="s-pharm-lic">License number</Label>
            <Input
              id="s-pharm-lic"
              value={form.licenseNumber}
              onChange={(e) => set("licenseNumber", e.target.value)}
            />
          </div>
        ) : null}

        {form.role === "LAB_TECHNICIAN" ? (
          <div className="space-y-1">
            <Label htmlFor="s-lab-qual">Qualification</Label>
            <Input
              id="s-lab-qual"
              value={form.qualification}
              onChange={(e) => set("qualification", e.target.value)}
            />
          </div>
        ) : null}

        <Button
          type="button"
          className="sm:col-span-2"
          disabled={createStaff.isPending}
          onClick={() => createStaff.mutate()}
        >
          {createStaff.isPending ? "Sending invite…" : "Invite staff user"}
        </Button>
      </CardContent>
    </Card>
  );
}
