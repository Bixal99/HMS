"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function WardDashboard() {
  const { accessToken } = useAuth();
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWards = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/wards", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWards(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchWards();
  }, [accessToken]);

  const getBedStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE": return <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">Available</span>;
      case "OCCUPIED": return <span className="inline-flex rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">Occupied</span>;
      case "MAINTENANCE": return <span className="inline-flex rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-warning-700">Maintenance</span>;
      default: return null;
    }
  };

  if (loading) return <div className="p-12 text-center text-neutral-500">Loading Wards...</div>;

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Ward & Bed Management</h1>
            <p className="mt-1 text-sm text-neutral-500">Real-time floor plan and occupancy tracking.</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Link href="/wards/admissions" className="inline-flex items-center rounded-md bg-white border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50">
              View Active Admissions
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {wards.map((ward) => {
            const totalBeds = ward.beds.length;
            const occupiedBeds = ward.beds.filter((b: any) => b.status === 'OCCUPIED').length;
            const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

            return (
              <div key={ward.id} className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
                {/* Ward Header */}
                <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">{ward.name}</h2>
                    <p className="text-sm text-neutral-500">Floor {ward.floor} • {ward.department.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-primary-700">{occupancyRate}%</div>
                    <div className="text-xs font-semibold uppercase text-neutral-500 tracking-wider">Occupancy</div>
                  </div>
                </div>

                {/* Beds Grid */}
                <div className="p-6 bg-neutral-50/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {ward.beds.map((bed: any) => {
                      const activeAdmission = bed.admissions?.[0];
                      return (
                        <div key={bed.id} className={`relative flex flex-col p-4 rounded-xl border-2 transition-all ${
                          bed.status === 'AVAILABLE' ? 'border-success/20 bg-success/5 hover:border-success/40' :
                          bed.status === 'OCCUPIED' ? 'border-danger/20 bg-danger/5' :
                          'border-warning/30 bg-warning/5'
                        }`}>
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-bold text-neutral-900">{bed.bedNumber}</span>
                            {getBedStatusBadge(bed.status)}
                          </div>
                          <div className="mt-auto">
                            <p className="text-xs text-neutral-500 mb-1">{bed.bedType.replace('_', ' ')}</p>
                            {bed.status === 'OCCUPIED' && activeAdmission ? (
                              <div className="text-sm font-semibold text-danger truncate">
                                {activeAdmission.patient.lastName}, {activeAdmission.patient.firstName[0]}.
                              </div>
                            ) : bed.status === 'AVAILABLE' ? (
                              <div className="text-sm font-medium text-success">Empty</div>
                            ) : (
                              <div className="text-sm font-medium text-warning-800">Cleaning/Repair</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {wards.length === 0 && (
            <div className="text-center py-12 text-neutral-500">No wards configured in the system.</div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
