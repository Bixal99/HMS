"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function AdminDashboard() {
  const { user, accessToken } = useAuth();
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/analytics/kpis", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.ok) setKpis((await res.json()).data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (accessToken) fetchKPIs();
  }, [accessToken]);

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Admin Overview</h1>
            <p className="text-neutral-500 mt-1">Welcome back, {user?.firstName}. Here is what's happening today.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/settings" className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg shadow-sm text-sm font-medium hover:bg-neutral-50 transition-colors">
              ⚙️ Global Settings
            </Link>
            <Link href="/admin/audit-logs" className="px-4 py-2 bg-primary-600 border border-transparent text-white rounded-lg shadow-sm text-sm font-medium hover:bg-primary-700 transition-colors">
              🛡️ Audit Logs
            </Link>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-neutral-200 animate-pulse h-32" />
            ))
          ) : (
            <>
              {/* Total Patients */}
              <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-neutral-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-1">Total Patients</p>
                    <h3 className="text-3xl font-black text-neutral-900">{kpis.totalPatients}</h3>
                  </div>
                  <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">🏥</div>
                </div>
              </div>

              {/* Occupancy Rate */}
              <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-neutral-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-1">Occupancy Rate</p>
                    <h3 className="text-3xl font-black text-neutral-900">{kpis.occupancyRate}%</h3>
                  </div>
                  <div className="p-3 bg-warning/10 text-warning-700 rounded-xl">🛏️</div>
                </div>
                <div className="w-full bg-neutral-100 h-1.5 mt-4 rounded-full overflow-hidden">
                  <div className="bg-warning-500 h-full rounded-full" style={{ width: `${kpis.occupancyRate}%` }} />
                </div>
              </div>

              {/* Appointments Today */}
              <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-neutral-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-1">Appointments Today</p>
                    <h3 className="text-3xl font-black text-neutral-900">{kpis.appointmentsToday}</h3>
                  </div>
                  <div className="p-3 bg-success/10 text-success-600 rounded-xl">📅</div>
                </div>
              </div>

              {/* Revenue */}
              <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-neutral-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-1">Total Revenue</p>
                    <h3 className="text-3xl font-black text-neutral-900">${(kpis.totalRevenueCents / 100).toFixed(2)}</h3>
                  </div>
                  <div className="p-3 bg-accent/10 text-accent-700 rounded-xl">💰</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Links / Navigation Grid */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
            <h2 className="text-lg font-bold text-neutral-900">Hospital Modules</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-neutral-100 sm:divide-x border-b border-neutral-100">
            <Link href="/staff" className="p-6 hover:bg-primary-50/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl group-hover:scale-110 transition-transform">👨‍⚕️</div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-primary-700 transition-colors">Staff Directory</h3>
                  <p className="text-sm text-neutral-500">Manage doctors, nurses, and schedules.</p>
                </div>
              </div>
            </Link>
            <Link href="/wards" className="p-6 hover:bg-primary-50/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center text-warning-700 text-xl group-hover:scale-110 transition-transform">🛏️</div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-warning-800 transition-colors">Ward Management</h3>
                  <p className="text-sm text-neutral-500">Track admissions and bed occupancy.</p>
                </div>
              </div>
            </Link>
            <Link href="/billing" className="p-6 hover:bg-primary-50/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center text-success-700 text-xl group-hover:scale-110 transition-transform">💳</div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-success-800 transition-colors">Billing & Finance</h3>
                  <p className="text-sm text-neutral-500">Generate invoices and process payments.</p>
                </div>
              </div>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-neutral-100 sm:divide-x">
            <Link href="/pharmacy" className="p-6 hover:bg-primary-50/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center text-accent-700 text-xl group-hover:scale-110 transition-transform">💊</div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-accent-800 transition-colors">Pharmacy</h3>
                  <p className="text-sm text-neutral-500">Manage medicine stock and dispensing.</p>
                </div>
              </div>
            </Link>
            <Link href="/inventory" className="p-6 hover:bg-primary-50/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 text-xl group-hover:scale-110 transition-transform">📦</div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-neutral-800 transition-colors">Inventory Tracking</h3>
                  <p className="text-sm text-neutral-500">Monitor consumables and low stock alerts.</p>
                </div>
              </div>
            </Link>
            <Link href="/patients" className="p-6 hover:bg-primary-50/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl group-hover:scale-110 transition-transform">🏥</div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-primary-700 transition-colors">Patient Records</h3>
                  <p className="text-sm text-neutral-500">Search profiles and medical histories.</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
