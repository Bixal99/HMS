"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function DoctorDashboard() {
  const { user } = useAuth();

  const quickLinks = [
    { name: "My Schedule", desc: "View your upcoming appointments", href: "/appointments", icon: "📅", color: "from-violet-500 to-violet-600" },
    { name: "Live Queue", desc: "See patients waiting for you", href: "/queue", icon: "⏱️", color: "from-amber-500 to-amber-600" },
    { name: "Patient Directory", desc: "Search and view medical records", href: "/patients", icon: "🏥", color: "from-emerald-500 to-emerald-600" },
  ];

  return (
    <ProtectedRoute allowedRoles={[Role.DOCTOR]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl bg-gradient-to-r from-accent-500 via-accent-600 to-accent-700 p-8 md:p-10 text-white mb-10 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold">Hello, Dr. {user?.lastName} 🩺</h1>
          <p className="mt-2 text-white/80 text-lg max-w-xl">Have a productive shift. Your patients are waiting.</p>
        </div>

        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.name} href={link.href}
              className="group relative bg-white rounded-xl p-6 shadow-sm ring-1 ring-neutral-200/60 hover:shadow-md hover:ring-primary-200 transition-all duration-200">
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center text-lg shadow-sm mb-4 group-hover:scale-110 transition-transform`}>{link.icon}</div>
              <h3 className="text-sm font-semibold text-neutral-900">{link.name}</h3>
              <p className="text-xs text-neutral-500 mt-1">{link.desc}</p>
              <svg className="absolute top-6 right-6 w-4 h-4 text-neutral-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
