"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function PatientPortal() {
  const { user } = useAuth();

  const quickLinks = [
    { name: "My Appointments", desc: "View and track your upcoming visits", href: "/appointments", icon: "📅" },
    { name: "My Medical Records", desc: "Access your clinical history", href: "/patients", icon: "📋" },
  ];

  return (
    <ProtectedRoute allowedRoles={[Role.PATIENT]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Patient Portal</h1>
        <p className="text-neutral-600 mb-8">Welcome, {user?.firstName}. View your health information below.</p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.name} href={link.href} className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 p-6 hover:shadow-md transition-shadow hover:ring-primary-300">
              <div className="text-3xl mb-4">{link.icon}</div>
              <h3 className="text-lg font-semibold text-neutral-900">{link.name}</h3>
              <p className="text-sm text-neutral-500 mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
