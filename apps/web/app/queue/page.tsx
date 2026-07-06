"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";

export default function DailyQueuePage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuth();

  const fetchTodayQueue = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`http://localhost:4000/api/appointments?date=${today}&limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAppointments(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch daily queue", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchTodayQueue();
      
      // Simple polling for "real-time" queue updates every 30 seconds
      const interval = setInterval(fetchTodayQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [accessToken]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/appointments/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Optimistically update the local state
        setAppointments(prev => prev.map(apt => 
          apt.id === id ? { ...apt, status: newStatus } : apt
        ));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR, Role.NURSE]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-neutral-900">Daily Queue</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Live tracking of today's patient visits, check-ins, and statuses. Automatically refreshes every 30 seconds.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waiting List (SCHEDULED / ARRIVED) */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
              <div className="bg-neutral-50 px-4 py-5 border-b border-neutral-200 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-neutral-900">Up Next / Waiting</h3>
              </div>
              <ul className="divide-y divide-neutral-200">
                {loading ? (
                  <li className="py-8 text-center text-sm text-neutral-500">Loading queue...</li>
                ) : appointments.filter(a => ["SCHEDULED", "ARRIVED"].includes(a.status)).length === 0 ? (
                  <li className="py-8 text-center text-sm text-neutral-500">No patients waiting.</li>
                ) : (
                  appointments.filter(a => ["SCHEDULED", "ARRIVED"].includes(a.status)).map(apt => {
                    const time = new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <li key={apt.id} className="p-4 sm:px-6 hover:bg-neutral-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${apt.status === 'ARRIVED' ? 'bg-warning/20 text-warning-800' : 'bg-neutral-100 text-neutral-600'}`}>
                              {apt.patient.firstName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-primary-600 truncate">{apt.patient.firstName} {apt.patient.lastName}</p>
                              <p className="text-sm text-neutral-500 mt-1">
                                {time} • Dr. {apt.doctor.user.lastName}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {apt.status === "SCHEDULED" && (
                              <button onClick={() => updateStatus(apt.id, "ARRIVED")} className="inline-flex items-center justify-center rounded bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning-800 hover:bg-warning/20">
                                Check-in
                              </button>
                            )}
                            {apt.status === "ARRIVED" && (
                              <button onClick={() => updateStatus(apt.id, "IN_PROGRESS")} className="inline-flex items-center justify-center rounded bg-primary-100 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-200">
                                Send to Doctor
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          </div>

          {/* In Progress & Completed */}
          <div className="col-span-1 space-y-6">
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
              <div className="bg-neutral-50 px-4 py-4 border-b border-neutral-200">
                <h3 className="text-base font-medium text-neutral-900">In Progress</h3>
              </div>
              <ul className="divide-y divide-neutral-200">
                {appointments.filter(a => a.status === "IN_PROGRESS").length === 0 ? (
                  <li className="py-6 text-center text-sm text-neutral-500">No active consults.</li>
                ) : (
                  appointments.filter(a => a.status === "IN_PROGRESS").map(apt => (
                    <li key={apt.id} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{apt.patient.firstName}</p>
                        <p className="text-xs text-neutral-500">With Dr. {apt.doctor.user.lastName}</p>
                      </div>
                      <button onClick={() => updateStatus(apt.id, "COMPLETED")} className="text-xs text-success bg-success/10 px-2 py-1 rounded hover:bg-success/20">
                        Complete
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden opacity-75">
              <div className="bg-neutral-50 px-4 py-4 border-b border-neutral-200">
                <h3 className="text-base font-medium text-neutral-900">Completed Today</h3>
              </div>
              <ul className="divide-y divide-neutral-200 max-h-60 overflow-y-auto">
                {appointments.filter(a => a.status === "COMPLETED").length === 0 ? (
                  <li className="py-6 text-center text-sm text-neutral-500">None completed yet.</li>
                ) : (
                  appointments.filter(a => a.status === "COMPLETED").map(apt => (
                    <li key={apt.id} className="p-4">
                      <p className="text-sm text-neutral-700">{apt.patient.firstName} {apt.patient.lastName}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
