"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";

export default function InventoryDashboard() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchItems = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/inventory", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) setItems((await res.json()).data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchItems();
  }, [accessToken]);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.NURSE]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Hospital Inventory</h1>
            <p className="mt-1 text-sm text-neutral-500">Manage consumables, PPE, and non-pharmacy supplies.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700">
              Add New Item
            </button>
          </div>
        </div>

        <div className="mb-6 max-w-md">
          <input
            type="text"
            placeholder="Search items by name, SKU, or category..."
            className="block w-full rounded-md border border-neutral-300 px-4 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-300">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">Stock Level</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Loading inventory...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No items found.</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-neutral-50 ${item.isLowStock ? 'bg-danger/5' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                        {item.name}
                        {item.isLowStock && (
                          <span className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                            Low Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{item.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-bold ${item.isLowStock ? 'text-danger' : 'text-neutral-900'}`}>
                        {item.quantity} <span className="text-neutral-500 font-normal">{item.unit}</span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">Reorder at: {item.reorderLevel}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-primary-600 hover:text-primary-900 text-sm font-medium mr-4">Log Outgoing</button>
                      <button className="text-primary-600 hover:text-primary-900 text-sm font-medium">Add Stock</button>
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
