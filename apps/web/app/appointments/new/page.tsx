"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function BookAppointmentPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [patients, setPatients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    departmentId: "",
    scheduledAtDate: "",
    scheduledAtTime: "",
    durationMinutes: 30,
    reasonForVisit: "",
    priority: "NORMAL",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, staffRes] = await Promise.all([
          fetch("http://localhost:4000/api/patients?limit=50", { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch("http://localhost:4000/api/staff?role=DOCTOR&limit=50", { headers: { Authorization: `Bearer ${accessToken}` } })
        ]);

        if (patientsRes.ok) {
          const pData = await patientsRes.json();
          setPatients(pData.data);
        }
        if (staffRes.ok) {
          const sData = await staffRes.json();
          setStaff(sData.data);
        }
      } catch (err) {
        console.error("Failed to fetch dropdown data", err);
      }
    };
    if (accessToken) fetchData();
  }, [accessToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      
      // Auto-assign department if doctor is selected
      if (name === "doctorId") {
        const selectedDoctor = staff.find(d => d.id === value);
        if (selectedDoctor) {
          next.departmentId = selectedDoctor.departmentId;
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const scheduledAt = new Date(`${formData.scheduledAtDate}T${formData.scheduledAtTime}:00`).toISOString();

      const payload = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        departmentId: formData.departmentId,
        scheduledAt,
        durationMinutes: Number(formData.durationMinutes),
        reasonForVisit: formData.reasonForVisit,
        priority: formData.priority,
      };

      const res = await fetch("http://localhost:4000/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to book appointment");
      }

      router.push("/appointments");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR]}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-neutral-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Book Appointment
            </h2>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-danger/10 p-4">
            <p className="text-sm font-medium text-danger">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-neutral-200 bg-white p-8 rounded-xl shadow-sm ring-1 ring-neutral-200">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-neutral-700">Select Patient <span className="text-danger">*</span></label>
                <select required name="patientId" value={formData.patientId} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 bg-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} (MRN: {p.mrn})</option>
                  ))}
                </select>
                {patients.length === 0 && <p className="mt-1 text-xs text-neutral-500">Please register a patient first.</p>}
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-neutral-700">Select Doctor <span className="text-danger">*</span></label>
                <select required name="doctorId" value={formData.doctorId} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 bg-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                  <option value="">-- Choose Doctor --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>Dr. {s.user.firstName} {s.user.lastName} ({s.department.name})</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-neutral-700">Date <span className="text-danger">*</span></label>
                <input required type="date" name="scheduledAtDate" value={formData.scheduledAtDate} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-neutral-700">Time <span className="text-danger">*</span></label>
                <input required type="time" name="scheduledAtTime" value={formData.scheduledAtTime} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-neutral-700">Duration (Minutes)</label>
                <select name="durationMinutes" value={formData.durationMinutes} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 bg-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                  <option value={15}>15 mins</option>
                  <option value={30}>30 mins</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>60 mins</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-neutral-700">Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 bg-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-neutral-700">Reason for Visit</label>
                <textarea rows={3} name="reasonForVisit" value={formData.reasonForVisit} onChange={handleChange} className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="Briefly describe the symptoms or reason for booking..." />
              </div>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => router.back()} className="rounded-md border border-neutral-300 bg-white py-2 px-4 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-70">
                {loading ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
