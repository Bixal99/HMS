"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function OnboardStaffPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "DOCTOR",
    departmentId: "d19ec637-2de7-45f6-8c46-953e5d0a6c08", // Hardcoded generic department for MVP
    designation: "",
    specialization: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to onboard staff");
      }

      router.push(`/staff/${data.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-neutral-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Onboard New Staff Member
            </h2>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-danger/10 p-4">
            <p className="text-sm font-medium text-danger">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 divide-y divide-neutral-200 bg-white p-8 rounded-xl shadow-sm ring-1 ring-neutral-200">
          <div className="space-y-8 divide-y divide-neutral-200">
            {/* User Account Details */}
            <div>
              <div>
                <h3 className="text-lg font-medium leading-6 text-neutral-900">User Account</h3>
                <p className="mt-1 text-sm text-neutral-500">System access credentials for the new employee.</p>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700">First name <span className="text-danger">*</span></label>
                  <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700">Last name <span className="text-danger">*</span></label>
                  <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700">Email Address <span className="text-danger">*</span></label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700">Temporary Password <span className="text-danger">*</span></label>
                  <input required type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" minLength={8} />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="pt-8">
              <div>
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Employment Details</h3>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700">System Role <span className="text-danger">*</span></label>
                  <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 bg-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                    <option value="DOCTOR">Doctor</option>
                    <option value="NURSE">Nurse</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="LAB_TECHNICIAN">Lab Technician</option>
                    <option value="PHARMACIST">Pharmacist</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700">Phone Number <span className="text-danger">*</span></label>
                  <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700">Job Designation <span className="text-danger">*</span></label>
                  <input required type="text" name="designation" placeholder="e.g. Senior Cardiologist" value={formData.designation} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700">Specialization</label>
                  <input type="text" name="specialization" placeholder="e.g. Pediatrics" value={formData.specialization} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md border border-neutral-300 bg-white py-2 px-4 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {loading ? "Onboarding..." : "Onboard Staff"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
