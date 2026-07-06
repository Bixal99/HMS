"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function SettingsDashboard() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchSettings = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/settings", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Initialize with default empty strings if missing
        setSettings({
          HOSPITAL_NAME: data.data.HOSPITAL_NAME || "MediCore Hospital",
          CONTACT_EMAIL: data.data.CONTACT_EMAIL || "info@medicore.com",
          CONTACT_PHONE: data.data.CONTACT_PHONE || "+1-800-123-4567",
          DEFAULT_TAX_RATE: data.data.DEFAULT_TAX_RATE || "0",
          CURRENCY_SYMBOL: data.data.CURRENCY_SYMBOL || "$",
          ENABLE_SMS_ALERTS: data.data.ENABLE_SMS_ALERTS ?? false,
          ...data.data
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchSettings();
  }, [accessToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");
    try {
      const res = await fetch("http://localhost:4000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSuccessMsg("Settings updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="p-12 text-center text-neutral-500">Loading settings...</div>;

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin" className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-6 inline-block">
          &larr; Back to Admin Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Global Configuration</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage hospital-wide settings and default values.</p>
        </div>

        {successMsg && (
          <div className="mb-6 bg-success/10 border border-success/20 text-success-800 px-4 py-3 rounded-md text-sm font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
            <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
              <h2 className="text-lg font-bold text-neutral-900">General Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Hospital Name</label>
                <input type="text" className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={settings.HOSPITAL_NAME} onChange={e => handleChange("HOSPITAL_NAME", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Contact Email</label>
                <input type="email" className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={settings.CONTACT_EMAIL} onChange={e => handleChange("CONTACT_EMAIL", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Contact Phone</label>
                <input type="text" className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={settings.CONTACT_PHONE} onChange={e => handleChange("CONTACT_PHONE", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
            <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
              <h2 className="text-lg font-bold text-neutral-900">Billing & Financial Defaults</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Default Tax Rate (%)</label>
                <input type="number" step="0.1" className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={settings.DEFAULT_TAX_RATE} onChange={e => handleChange("DEFAULT_TAX_RATE", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Currency Symbol</label>
                <input type="text" className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  value={settings.CURRENCY_SYMBOL} onChange={e => handleChange("CURRENCY_SYMBOL", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
            <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
              <h2 className="text-lg font-bold text-neutral-900">System Features</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center">
                <input id="smsAlerts" type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  checked={settings.ENABLE_SMS_ALERTS} onChange={e => handleChange("ENABLE_SMS_ALERTS", e.target.checked)} />
                <label htmlFor="smsAlerts" className="ml-2 block text-sm font-medium text-neutral-700">
                  Enable SMS Alerts for Patients (Requires Twilio integration)
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSaving} className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50">
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
