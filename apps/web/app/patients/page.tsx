"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  dob: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { accessToken } = useAuth();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const url = new URL(apiUrl("/api/patients"));
        if (search) url.searchParams.append("search", search);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          setPatients(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch patients", error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchPatients();
    }
  }, [accessToken, search]);

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.NURSE]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-neutral-900">Patients Directory</h1>
            <p className="mt-2 text-sm text-neutral-600">
              A complete list of all registered patients in the MediCore facility.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/patients/new"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
            >
              Register New Patient
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="w-full max-w-sm">
            <input
              type="text"
              placeholder="Search by name, MRN, or phone..."
              className="block w-full rounded-md border border-neutral-300 px-4 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-neutral-300">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">MRN</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">Name</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">Phone</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">Gender</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">Age</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">View</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-sm text-neutral-500">Loading patients...</td>
                      </tr>
                    ) : patients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-sm text-neutral-500">No patients found.</td>
                      </tr>
                    ) : (
                      patients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900 sm:pl-6">
                            {patient.mrn}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                            {patient.firstName} {patient.lastName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                            {patient.phone}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500 capitalize">
                            {patient.gender.toLowerCase()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                            {new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link href={`/patients/${patient.id}`} className="text-primary-600 hover:text-primary-900">
                              View<span className="sr-only">, {patient.firstName}</span>
                            </Link>
                          </td>
                        </tr>
                      ))
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
