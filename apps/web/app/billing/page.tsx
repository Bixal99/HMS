"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function BillingDashboard() {
  const { accessToken } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `http://localhost:4000/api/billing?status=${statusFilter}` : "http://localhost:4000/api/billing";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchInvoices();
  }, [accessToken, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "DRAFT": return <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">Draft</span>;
      case "ISSUED": return <span className="inline-flex rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">Issued</span>;
      case "PARTIALLY_PAID": return <span className="inline-flex rounded-full bg-warning-100 px-2.5 py-0.5 text-xs font-medium text-warning-800">Partially Paid</span>;
      case "PAID": return <span className="inline-flex rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-medium text-success-800">Paid</span>;
      case "VOID": return <span className="inline-flex rounded-full bg-danger-100 px-2.5 py-0.5 text-xs font-medium text-danger-800">Void</span>;
      default: return null;
    }
  };

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.BILLING_OFFICER, Role.RECEPTIONIST]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Billing & Invoicing</h1>
            <p className="mt-1 text-sm text-neutral-500">Manage patient invoices, track payments, and process claims.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700">
              Create Invoice
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block rounded-md border-neutral-300 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm shadow-sm"
          >
            <option value="">All Invoices</option>
            <option value="DRAFT">Drafts</option>
            <option value="ISSUED">Issued (Unpaid)</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-300">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Invoice ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Patient</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Date</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">Total</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wide text-neutral-500">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-500">Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-500">No invoices found.</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">
                      #{inv.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-neutral-900">{inv.patient.firstName} {inv.patient.lastName}</div>
                      <div className="text-sm text-neutral-500">MRN: {inv.patient.mrn}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-neutral-900">
                      ${(inv.total / 100).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <Link href={`/billing/${inv.id}`} className="text-primary-600 hover:text-primary-900">
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
