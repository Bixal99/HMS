"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const { accessToken } = useAuth();

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const url = new URL("http://localhost:4000/api/appointments");
        if (filterDate) url.searchParams.append("date", filterDate);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setAppointments(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch appointments", error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchAppointments();
    }
  }, [accessToken, filterDate]);

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.NURSE]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-neutral-900">Appointments</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Manage patient bookings, view schedules, and track upcoming visits.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/appointments/new"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
            >
              Book Appointment
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="w-full max-w-xs">
            <input
              type="date"
              className="block w-full rounded-md border border-neutral-300 px-4 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-neutral-300 bg-white">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">Time</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">Patient</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">Doctor</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">Status</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">Reason</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="whitespace-nowrap py-12 text-center text-sm text-neutral-500">
                          Loading appointments...
                        </td>
                      </tr>
                    ) : appointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="whitespace-nowrap py-12 text-center text-sm text-neutral-500">
                          No appointments found for the selected date.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((apt) => {
                        const date = new Date(apt.scheduledAt);
                        return (
                          <tr key={apt.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900 sm:pl-6">
                              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <div className="text-xs text-neutral-500 font-normal">{date.toLocaleDateString()}</div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900">
                              {apt.patient.firstName} {apt.patient.lastName}
                              <div className="text-xs text-neutral-500">MRN: {apt.patient.mrn}</div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-900">
                              Dr. {apt.doctor.user.firstName} {apt.doctor.user.lastName}
                              <div className="text-xs text-neutral-500">{apt.department.name}</div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                apt.status === 'SCHEDULED' ? 'bg-info/10 text-info' :
                                apt.status === 'ARRIVED' ? 'bg-warning/10 text-warning' :
                                apt.status === 'IN_PROGRESS' ? 'bg-primary-100 text-primary-700' :
                                apt.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                                'bg-danger/10 text-danger'
                              }`}>
                                {apt.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 truncate max-w-xs">
                              {apt.reasonForVisit || '—'}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <button className="text-primary-600 hover:text-primary-900 font-medium bg-primary-50 px-3 py-1 rounded-md">
                                Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
