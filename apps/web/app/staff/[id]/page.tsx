"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function StaffProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { accessToken } = useAuth();
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/staff/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setStaff(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch staff member", error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken && id) {
      fetchStaff();
    }
  }, [accessToken, id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-500">
        Staff member not found.
      </div>
    );
  }

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.NURSE]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold uppercase shadow-sm">
              {staff.user.firstName[0]}{staff.user.lastName[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-7 text-neutral-900 sm:truncate sm:text-3xl sm:tracking-tight">
                {staff.user.role === Role.DOCTOR ? 'Dr. ' : ''}{staff.user.firstName} {staff.user.lastName}
              </h2>
              <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                <div className="mt-2 flex items-center text-sm text-neutral-500">
                  <span className="font-medium text-neutral-900 mr-2">Employee ID:</span> {staff.employeeCode}
                </div>
                <div className="mt-2 flex items-center text-sm text-neutral-500">
                  <span className="font-medium text-neutral-900 mr-2">Role:</span> 
                  <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success capitalize">
                    {staff.user.role.toLowerCase().replace("_", " ")}
                  </span>
                </div>
                <div className="mt-2 flex items-center text-sm text-neutral-500">
                  <span className="font-medium text-neutral-900 mr-2">Dept:</span> {staff.department.name}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
            <Link href={`/staff/${id}/edit`} className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              Edit Profile
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Employment Information</h3>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Designation</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{staff.designation}</dd>
                </div>
                {staff.specialization && (
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Specialization</dt>
                    <dd className="mt-1 text-sm text-neutral-900">{staff.specialization}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Joined Date</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{new Date(staff.dateJoined).toLocaleDateString()}</dd>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Contact Details</h3>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Email Address</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{staff.user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-neutral-500">Phone Number</dt>
                  <dd className="mt-1 text-sm text-neutral-900">{staff.user.phone}</dd>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Weekly Availability */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-xl">
              <div className="px-4 py-5 sm:px-6 border-b border-neutral-200 flex justify-between items-center">
                <h3 className="text-lg font-medium leading-6 text-neutral-900">Weekly Availability</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Manage Schedule</button>
              </div>
              <div className="px-4 py-5 sm:p-6">
                {staff.availability?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {staff.availability.map((slot: any) => (
                      <div key={slot.id} className="rounded-lg border border-neutral-200 p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">{daysOfWeek[slot.dayOfWeek]}</p>
                          <p className="text-sm text-neutral-500">
                            {slot.startTime} - {slot.endTime}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">
                          {slot.slotDurationMinutes} min slots
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-neutral-50 rounded-lg border border-dashed border-neutral-300">
                    <p className="text-sm text-neutral-500">No availability schedule has been set up yet.</p>
                    <button className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-500">Set Availability</button>
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
