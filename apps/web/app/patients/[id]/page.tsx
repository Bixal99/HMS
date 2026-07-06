"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PatientProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { accessToken } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/patients/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setPatient(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch patient", error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken && id) {
      fetchPatient();
    }
  }, [accessToken, id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-500">
        Patient not found.
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.NURSE]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold uppercase shadow-sm">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-7 text-neutral-900 sm:truncate sm:text-3xl sm:tracking-tight">
                {patient.firstName} {patient.lastName}
              </h2>
              <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                <div className="mt-2 flex items-center text-sm text-neutral-500">
                  <span className="font-medium text-neutral-900 mr-2">MRN:</span> {patient.mrn}
                </div>
                <div className="mt-2 flex items-center text-sm text-neutral-500">
                  <span className="font-medium text-neutral-900 mr-2">Age:</span> {age} yrs
                </div>
                <div className="mt-2 flex items-center text-sm text-neutral-500 capitalize">
                  <span className="font-medium text-neutral-900 mr-2">Gender:</span> {patient.gender.toLowerCase()}
                </div>
                {patient.bloodGroup && (
                  <div className="mt-2 flex items-center text-sm text-neutral-500">
                    <span className="font-medium text-neutral-900 mr-2">Blood:</span> <span className="text-danger font-bold">{patient.bloodGroup}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
            <Link href={`/patients/${id}/edit`} className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              Edit Patient
            </Link>
            <Link href={`/patients/${id}/emr`} className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              EMR Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Details */}
          <div className="space-y-6">
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Contact Information</h3>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Phone</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{patient.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Email</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{patient.email || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Address</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{patient.address || "N/A"}</dd>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Emergency & Insurance</h3>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Emergency Contact</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{patient.emergencyContactName || "N/A"} ({patient.emergencyContactPhone || "N/A"})</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Insurance Provider</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{patient.insuranceProvider || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Policy Number</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{patient.insurancePolicyNo || "N/A"}</dd>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 border-b border-neutral-200 flex justify-between items-center">
                <h3 className="text-lg font-medium leading-6 text-neutral-900 flex items-center gap-2">
                  Allergies
                  <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
                    {patient.allergies?.length || 0}
                  </span>
                </h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Add</button>
              </div>
              <div className="px-4 py-5 sm:p-6">
                {patient.allergies?.length > 0 ? (
                  <ul className="divide-y divide-neutral-200">
                    {patient.allergies.map((allergy: any) => (
                      <li key={allergy.id} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{allergy.allergen}</p>
                          <p className="text-xs text-neutral-500">{allergy.notes}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          allergy.severity === 'severe' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning-800'
                        }`}>
                          {allergy.severity}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-neutral-500 italic">No known allergies recorded.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Timeline & Clinical Data */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Upcoming Appointments</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                {patient.appointments?.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-my-5 divide-y divide-neutral-200">
                      {patient.appointments.map((apt: any) => (
                        <li key={apt.id} className="py-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-lg bg-primary-50 flex flex-col items-center justify-center border border-primary-100">
                                <span className="text-xs font-bold text-primary-700">{new Date(apt.scheduledAt).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-sm font-bold text-primary-900">{new Date(apt.scheduledAt).getDate()}</span>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-neutral-900">
                                {new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="truncate text-sm text-neutral-500">{apt.reasonForVisit || "General Consultation"}</p>
                            </div>
                            <div>
                              <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                                {apt.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-neutral-500">No upcoming appointments.</p>
                    <button className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-500">Schedule one now</button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Recent Encounters</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                {patient.encounters?.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-my-5 divide-y divide-neutral-200">
                      {patient.encounters.map((enc: any) => (
                        <li key={enc.id} className="py-5">
                          <div className="relative focus-within:ring-2 focus-within:ring-primary-500">
                            <h3 className="text-sm font-semibold text-neutral-800">
                              <Link href={`/encounters/${enc.id}`} className="hover:underline focus:outline-none">
                                <span className="absolute inset-0" aria-hidden="true" />
                                {new Date(enc.encounterDate).toLocaleDateString()}
                              </Link>
                            </h3>
                            <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{enc.chiefComplaint || "Routine follow up"}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-neutral-500">No past encounters on record.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
