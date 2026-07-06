"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function AuditLogsDashboard() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/audit-logs", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) setLogs((await res.json()).data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchLogs();
  }, [accessToken]);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.user.email.toLowerCase().includes(search.toLowerCase()) ||
    l.entityId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin" className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-6 inline-block">
          &larr; Back to Admin Dashboard
        </Link>

        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">System Audit Logs</h1>
            <p className="mt-1 text-sm text-neutral-500">HIPAA compliant tracking of all mutating system actions.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button onClick={fetchLogs} className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50">
              Refresh Logs
            </button>
          </div>
        </div>

        <div className="mb-6 max-w-md">
          <input
            type="text"
            placeholder="Search logs by email, action, or ID..."
            className="block w-full rounded-md border border-neutral-300 px-4 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-300">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Entity ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Payload Sample</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Loading audit logs...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No logs found.</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-neutral-900">{log.user.firstName} {log.user.lastName}</div>
                      <div className="text-xs text-neutral-500">{log.user.email} <span className="font-semibold text-primary-600">({log.user.role})</span></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                        log.action.startsWith('DELETE') ? 'bg-danger/10 text-danger' :
                        log.action.startsWith('POST') ? 'bg-success/10 text-success' :
                        'bg-warning/20 text-warning-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 font-mono text-xs">
                      {log.entityId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 max-w-xs truncate font-mono text-xs">
                      {log.afterJson ? JSON.stringify(log.afterJson) : '{}'}
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
