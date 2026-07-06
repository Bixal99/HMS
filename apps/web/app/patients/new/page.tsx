"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function NewPatientPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "MALE",
    bloodGroup: "",
    phone: "",
    email: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    insuranceProvider: "",
    insurancePolicyNo: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to register patient");
      }

      // Redirect to patient profile
      router.push(`/patients/${data.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.RECEPTIONIST]}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-neutral-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Register New Patient
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
            {/* Demographics */}
            <div>
              <div>
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Demographics</h3>
                <p className="mt-1 text-sm text-neutral-500">Basic personal information of the patient.</p>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700">First name <span className="text-danger">*</span></label>
                  <div className="mt-1">
                    <input required type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700">Last name <span className="text-danger">*</span></label>
                  <div className="mt-1">
                    <input required type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="dob" className="block text-sm font-medium text-neutral-700">Date of Birth <span className="text-danger">*</span></label>
                  <div className="mt-1">
                    <input required type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="gender" className="block text-sm font-medium text-neutral-700">Gender <span className="text-danger">*</span></label>
                  <div className="mt-1">
                    <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3 bg-white">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="bloodGroup" className="block text-sm font-medium text-neutral-700">Blood Group</label>
                  <div className="mt-1">
                    <select id="bloodGroup" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3 bg-white">
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="pt-8">
              <div>
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Contact Information</h3>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">Phone Number <span className="text-danger">*</span></label>
                  <div className="mt-1">
                    <input required type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700">Email Address</label>
                  <div className="mt-1">
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>
                <div className="sm:col-span-6">
                  <label htmlFor="address" className="block text-sm font-medium text-neutral-700">Residential Address</label>
                  <div className="mt-1">
                    <textarea name="address" id="address" rows={3} value={formData.address} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="emergencyContactName" className="block text-sm font-medium text-neutral-700">Emergency Contact Name</label>
                  <div className="mt-1">
                    <input type="text" name="emergencyContactName" id="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-neutral-700">Emergency Contact Phone</label>
                  <div className="mt-1">
                    <input type="text" name="emergencyContactPhone" id="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance Info */}
            <div className="pt-8">
              <div>
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Insurance Details</h3>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="insuranceProvider" className="block text-sm font-medium text-neutral-700">Provider Name</label>
                  <div className="mt-1">
                    <input type="text" name="insuranceProvider" id="insuranceProvider" value={formData.insuranceProvider} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="insurancePolicyNo" className="block text-sm font-medium text-neutral-700">Policy Number</label>
                  <div className="mt-1">
                    <input type="text" name="insurancePolicyNo" id="insurancePolicyNo" value={formData.insurancePolicyNo} onChange={handleChange} className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border py-2 px-3" />
                  </div>
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
                {loading ? "Registering..." : "Register Patient"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
