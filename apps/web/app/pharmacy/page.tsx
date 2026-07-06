"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useEffect, useState } from "react";

interface Medicine {
  id: string;
  name: string;
  genericName: string;
  form: string;
  strength: string;
  totalStock: number;
  reorderThreshold: number;
}

export default function PharmacyCatalog() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchMedicines();
  }, [search]);

  const fetchMedicines = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/pharmacy/medicines?page=1&limit=50&search=${search}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setMedicines(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.PHARMACIST]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Pharmacy Inventory</h1>
            <p className="mt-1 text-sm text-neutral-500">Manage medicine catalog and monitor stock levels.</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <a href="/pharmacy/dispense" className="inline-flex items-center rounded-md bg-accent-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-700">
              Dispense Prescriptions
            </a>
            <button className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700">
              + Add Medicine
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by medicine or generic name..."
            className="block w-full max-w-md rounded-md border border-neutral-300 px-4 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Catalog Table */}
        <div className="overflow-hidden bg-white shadow-sm ring-1 ring-neutral-300 rounded-lg">
          <table className="min-w-full divide-y divide-neutral-300">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Medicine Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Generic Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Form & Strength</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Stock Level</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-neutral-500">Loading catalog...</td></tr>
              ) : medicines.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No medicines found.</td></tr>
              ) : (
                medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-neutral-900">{med.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600">{med.genericName}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600">{med.form} - {med.strength}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className="font-medium text-neutral-900">{med.totalStock}</span> units
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      {med.totalStock === 0 ? (
                        <span className="inline-flex rounded-full bg-danger/10 px-2 text-xs font-semibold leading-5 text-danger">Out of Stock</span>
                      ) : med.totalStock <= med.reorderThreshold ? (
                        <span className="inline-flex rounded-full bg-warning/20 px-2 text-xs font-semibold leading-5 text-warning-700">Low Stock</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-success/10 px-2 text-xs font-semibold leading-5 text-success">In Stock</span>
                      )}
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
