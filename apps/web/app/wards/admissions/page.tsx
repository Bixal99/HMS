"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function AdmissionsList() {
  const { accessToken } = useAuth();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Discharge modal state
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdmissions = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/wards/admissions", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) setAdmissions((await res.json()).data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchAdmissions();
  }, [accessToken]);

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/wards/admissions/${selectedAdmission.id}/discharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ dischargeSummary }),
      });
      if (res.ok) {
        setShowDischargeModal(false);
        setDischargeSummary("");
        fetchAdmissions();
      } else {
        alert("Failed to discharge patient");
      }
    } catch (err) {
      alert("Failed to discharge patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-neutral-500">Loading Admissions...</div>;

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        <Link href="/wards" className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-6 inline-block">
          &larr; Back to Ward Floor Plan
        </Link>

        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Active Admissions</h1>
            <p className="mt-1 text-sm text-neutral-500">List of all currently admitted inpatients.</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700">
              New Admission
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-300">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Admitted At</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Attending</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {admissions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No active admissions.</td></tr>
              ) : (
                admissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-neutral-900">{adm.patient.lastName}, {adm.patient.firstName}</div>
                      <div className="text-xs text-neutral-500">MRN: {adm.patient.mrn}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-neutral-900">{adm.bed.ward.name}</div>
                      <div className="text-xs text-neutral-500">Bed {adm.bed.bedNumber} (Floor {adm.bed.ward.floor})</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {new Date(adm.admittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      Dr. {adm.admitter.user.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => { setSelectedAdmission(adm); setShowDischargeModal(true); }}
                        className="text-xs font-bold text-danger hover:text-danger-700 bg-danger/10 hover:bg-danger/20 px-3 py-1.5 rounded-md transition-colors"
                      >
                        Discharge
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Discharge Modal */}
        {showDischargeModal && selectedAdmission && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Discharge Patient</h3>
              <p className="text-sm text-neutral-500 mb-6">
                You are about to discharge <strong className="text-neutral-900">{selectedAdmission.patient.firstName} {selectedAdmission.patient.lastName}</strong> from 
                Bed <strong className="text-neutral-900">{selectedAdmission.bed.bedNumber}</strong>. This will mark the bed as Available.
              </p>
              
              <form onSubmit={handleDischarge} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Discharge Summary / Notes</label>
                  <textarea rows={4} required className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={dischargeSummary} onChange={e => setDischargeSummary(e.target.value)} 
                    placeholder="Brief summary of hospital stay and discharge instructions..." />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowDischargeModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-md hover:bg-danger-700 disabled:opacity-50">
                    {isSubmitting ? "Discharging..." : "Confirm Discharge"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
