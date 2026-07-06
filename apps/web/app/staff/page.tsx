"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Staff {
  id: string;
  employeeCode: string;
  designation: string;
  specialization: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  };
  department: {
    name: string;
  };
}

export default function StaffDirectoryPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { accessToken, user } = useAuth();

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const url = new URL("http://localhost:4000/api/staff");
        if (search) url.searchParams.append("search", search);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setStaffList(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch staff directory", error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchStaff();
    }
  }, [accessToken, search]);

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.NURSE]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-neutral-900">Staff Directory</h1>
            <p className="mt-2 text-sm text-neutral-600">
              A comprehensive directory of all healthcare professionals and administrative staff.
            </p>
          </div>
          {user?.role === Role.ADMIN && (
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <Link
                href="/staff/new"
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
              >
                Onboard New Staff
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="w-full max-w-md">
            <input
              type="text"
              placeholder="Search by name, employee code, or specialization..."
              className="block w-full rounded-md border border-neutral-300 px-4 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-neutral-500">Loading directory...</div>
          ) : staffList.length === 0 ? (
            <div className="col-span-full text-center py-12 text-neutral-500">No staff members found matching your criteria.</div>
          ) : (
            staffList.map((staff) => (
              <div key={staff.id} className="col-span-1 flex flex-col divide-y divide-neutral-200 rounded-lg bg-white text-center shadow-sm ring-1 ring-neutral-200 hover:shadow-md transition-shadow">
                <div className="flex flex-1 flex-col p-8">
                  <div className="mx-auto h-20 w-20 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold">
                    {staff.user.firstName[0]}{staff.user.lastName[0]}
                  </div>
                  <h3 className="mt-6 text-sm font-medium text-neutral-900">Dr. {staff.user.firstName} {staff.user.lastName}</h3>
                  <dl className="mt-1 flex flex-grow flex-col justify-between">
                    <dt className="sr-only">Specialization</dt>
                    <dd className="text-sm text-neutral-500">{staff.specialization || staff.designation}</dd>
                    <dt className="sr-only">Role</dt>
                    <dd className="mt-3">
                      <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success capitalize">
                        {staff.user.role.toLowerCase().replace("_", " ")}
                      </span>
                    </dd>
                  </dl>
                </div>
                <div>
                  <div className="-mt-px flex divide-x divide-neutral-200">
                    <div className="flex w-0 flex-1">
                      <Link
                        href={`/staff/${staff.id}`}
                        className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center rounded-bl-lg border border-transparent py-4 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50"
                      >
                        <span className="ml-3">View Profile</span>
                      </Link>
                    </div>
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
