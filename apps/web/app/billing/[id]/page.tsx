"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function InvoiceDetails() {
  const params = useParams();
  const id = params.id as string;
  const { accessToken } = useAuth();
  
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/billing/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setInvoice((await res.json()).data);
    } catch (error) {
      console.error("Failed to fetch invoice", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && id) fetchInvoice();
  }, [accessToken, id]);

  const handleIssueInvoice = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/billing/${id}/issue`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) fetchInvoice();
    } catch (err) {
      alert("Failed to issue invoice");
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const amountCents = Math.round(parseFloat(paymentAmount) * 100);
      const res = await fetch(`http://localhost:4000/api/billing/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ amountCents, method: paymentMethod }),
      });

      if (!res.ok) throw new Error((await res.json()).message);
      
      setShowPaymentModal(false);
      setPaymentAmount("");
      fetchInvoice();
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-neutral-500">Loading invoice details...</div>;
  if (!invoice) return <div className="p-12 text-center text-neutral-500">Invoice not found</div>;

  const totalPaid = invoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const balanceDue = invoice.total - totalPaid;

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.BILLING_OFFICER, Role.RECEPTIONIST]}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/billing" className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-6 inline-block">
          &larr; Back to Billing
        </Link>

        <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
          {/* Invoice Header */}
          <div className="border-b border-neutral-100 bg-neutral-50 px-8 py-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 uppercase">INVOICE</h1>
              <p className="text-sm text-neutral-500 mt-1">#{invoice.id}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                invoice.status === 'PAID' ? 'bg-success-100 text-success-800' :
                invoice.status === 'DRAFT' ? 'bg-neutral-200 text-neutral-800' :
                invoice.status === 'PARTIALLY_PAID' ? 'bg-warning-100 text-warning-800' :
                'bg-primary-100 text-primary-800'
              }`}>
                {invoice.status.replace('_', ' ')}
              </span>
              <p className="text-sm text-neutral-500 mt-2">Date: {new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-2">Billed To</h3>
                <p className="font-semibold text-neutral-900">{invoice.patient.firstName} {invoice.patient.lastName}</p>
                <p className="text-sm text-neutral-600">MRN: {invoice.patient.mrn}</p>
                {invoice.patient.phone && <p className="text-sm text-neutral-600">{invoice.patient.phone}</p>}
                {invoice.patient.email && <p className="text-sm text-neutral-600">{invoice.patient.email}</p>}
              </div>
              <div className="text-right">
                <h3 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-2">MediCore Hospital</h3>
                <p className="text-sm text-neutral-600">123 Healthcare Ave</p>
                <p className="text-sm text-neutral-600">Medical District, NY 10001</p>
                <p className="text-sm text-neutral-600">billing@medicore.com</p>
              </div>
            </div>

            {/* Line Items */}
            <table className="min-w-full divide-y divide-neutral-200 mb-8">
              <thead>
                <tr>
                  <th className="py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Description</th>
                  <th className="py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Qty</th>
                  <th className="py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Unit Price</th>
                  <th className="py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {invoice.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-4 text-sm font-medium text-neutral-900">{item.description}</td>
                    <td className="py-4 text-sm text-neutral-600 text-right">{item.quantity}</td>
                    <td className="py-4 text-sm text-neutral-600 text-right">${(item.unitPrice / 100).toFixed(2)}</td>
                    <td className="py-4 text-sm text-neutral-900 text-right font-medium">${(item.lineTotal / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-neutral-200 pt-6">
              <div className="flex justify-end">
                <dl className="space-y-3 text-sm w-64">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Subtotal</dt>
                    <dd className="font-medium text-neutral-900">${(invoice.subtotal / 100).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Tax (0%)</dt>
                    <dd className="font-medium text-neutral-900">$0.00</dd>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-3 text-base">
                    <dt className="font-bold text-neutral-900">Total Invoice Amount</dt>
                    <dd className="font-bold text-neutral-900">${(invoice.total / 100).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-success-700 pt-1">
                    <dt className="font-medium">Amount Paid</dt>
                    <dd className="font-medium">-${(totalPaid / 100).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-3 text-lg">
                    <dt className="font-black text-danger-700">Balance Due</dt>
                    <dd className="font-black text-danger-700">${(balanceDue / 100).toFixed(2)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-neutral-50 px-8 py-5 border-t border-neutral-200 flex justify-end gap-3">
            <button className="px-4 py-2 bg-white border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Print Receipt
            </button>
            {invoice.status === 'DRAFT' && (
              <button onClick={handleIssueInvoice} className="px-4 py-2 bg-accent-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-accent-700">
                Issue Invoice
              </button>
            )}
            {(invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID') && (
              <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700">
                Process Payment
              </button>
            )}
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Payment History</h3>
            <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {invoice.payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 text-sm text-neutral-600">{new Date(p.paidAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900 font-medium">{p.method}</td>
                      <td className="px-6 py-4 text-sm text-success-700 font-bold text-right">${(p.amount / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-neutral-900 mb-4">Process Payment</h3>
              <form onSubmit={handleProcessPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Payment Amount ($)</label>
                  <input required type="number" step="0.01" max={balanceDue / 100}
                    className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  />
                  <p className="text-xs text-neutral-500 mt-1">Balance Due: ${(balanceDue / 100).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Payment Method</label>
                  <select required className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50">Confirm Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
