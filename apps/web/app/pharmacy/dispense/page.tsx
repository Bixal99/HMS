"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useEffect, useState } from "react";
import Link from "next/link";

interface PrescriptionItem {
  id: string;
  medicine: {
    name: string;
    form: string;
    strength: string;
  };
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
  prescription: {
    status: string;
    encounter: {
      patient: {
        firstName: string;
        lastName: string;
        mrn: string;
      };
      doctor: {
        user: {
          firstName: string;
          lastName: string;
        };
      };
    };
  };
}

export default function DispenseQueue() {
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispensingId, setDispensingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingPrescriptions();
  }, []);

  const fetchPendingPrescriptions = async () => {
    // In a real app, you'd have an endpoint for pending prescription items.
    // For this prototype, we're assuming a generic dispensing UI structure.
    setLoading(false);
  };

  const handleDispense = async (itemId: string) => {
    setDispensingId(itemId);
    try {
      const res = await fetch("http://localhost:4000/api/pharmacy/dispense", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ prescriptionItemId: itemId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Remove from list
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      alert("Medicine dispensed successfully! Stock updated via FEFO.");
    } catch (error: any) {
      alert(`Dispense failed: ${error.message}`);
    } finally {
      setDispensingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.PHARMACIST]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link href="/pharmacy" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Catalog
          </Link>
        </div>

        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Dispensing Queue</h1>
            <p className="mt-1 text-sm text-neutral-500">Pending prescriptions waiting to be fulfilled.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-12 text-neutral-500">Loading queue...</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-neutral-900">Queue is empty</h3>
              <p className="mt-1 text-sm text-neutral-500">All prescriptions have been fulfilled!</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
                <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900">
                      {item.prescription.encounter.patient.firstName} {item.prescription.encounter.patient.lastName}
                    </h3>
                    <p className="text-xs text-neutral-500">MRN: {item.prescription.encounter.patient.mrn}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900">
                      Dr. {item.prescription.encounter.doctor.user.lastName}
                    </p>
                    <span className="inline-flex rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-warning-700">
                      Pending
                    </span>
                  </div>
                </div>
                <div className="px-6 py-5 sm:flex sm:items-center sm:justify-between">
                  <div className="sm:flex-auto">
                    <h4 className="text-lg font-bold text-primary-700">
                      {item.medicine.name} <span className="text-sm font-medium text-neutral-500">({item.medicine.form} - {item.medicine.strength})</span>
                    </h4>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-neutral-600 sm:flex sm:gap-6">
                      <div><strong className="font-medium text-neutral-900">Dosage:</strong> {item.dosage}</div>
                      <div><strong className="font-medium text-neutral-900">Frequency:</strong> {item.frequency}</div>
                      <div><strong className="font-medium text-neutral-900">Duration:</strong> {item.durationDays} days</div>
                    </div>
                    <p className="mt-2 text-sm text-neutral-500">
                      <strong className="font-medium text-neutral-700">Sig:</strong> {item.instructions}
                    </p>
                  </div>
                  <div className="mt-4 sm:ml-6 sm:mt-0 sm:flex-shrink-0">
                    <button
                      onClick={() => handleDispense(item.id)}
                      disabled={dispensingId === item.id}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
                    >
                      {dispensingId === item.id ? "Dispensing..." : "Dispense Medicine"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
