"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Role } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PatientEMRPage() {
  const params = useParams();
  const id = params.id as string;
  const { accessToken, user } = useAuth();
  
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState<"history" | "new_encounter" | "vitals">("history");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [soapData, setSoapData] = useState({ chiefComplaint: "", subjective: "", objective: "", assessment: "", plan: "" });
  const [vitalsData, setVitalsData] = useState({ encounterId: "", bpSystolic: "", bpDiastolic: "", temperatureC: "", pulseBpm: "", weightKg: "", heightCm: "" });

  // Edit / Version History State
  const [editingEncounterId, setEditingEncounterId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ chiefComplaint: "", subjective: "", objective: "", assessment: "", plan: "" });
  const [historyLogs, setHistoryLogs] = useState<Record<string, any[]>>({});
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [patientRes, historyRes] = await Promise.all([
        fetch(`http://localhost:4000/api/patients/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(`http://localhost:4000/api/records/patients/${id}/history`, { headers: { Authorization: `Bearer ${accessToken}` } })
      ]);

      if (patientRes.ok) setPatient((await patientRes.json()).data);
      if (historyRes.ok) setHistory((await historyRes.json()).data);
    } catch (error) {
      console.error("Failed to fetch EMR data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && id) {
      fetchData();
    }
  }, [accessToken, id]);

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const staffRes = await fetch(`http://localhost:4000/api/staff?role=DOCTOR&search=${user?.firstName}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const staffData = await staffRes.json();
      const doctorId = staffData.data[0]?.id;

      if (!doctorId) throw new Error("Doctor profile not found for logged in user");

      const payload = { patientId: id, doctorId, ...soapData };

      const res = await fetch("http://localhost:4000/api/records/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).message || "Failed to save encounter");
      
      setSoapData({ chiefComplaint: "", subjective: "", objective: "", assessment: "", plan: "" });
      setActiveTab("history");
      fetchData(); 
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEncounterId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/records/encounters/${editingEncounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to update encounter");
      
      setEditingEncounterId(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadEncounterHistory = async (encounterId: string) => {
    if (showHistoryFor === encounterId) {
      setShowHistoryFor(null);
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/records/encounters/${encounterId}/history`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(prev => ({ ...prev, [encounterId]: data.data }));
        setShowHistoryFor(encounterId);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        encounterId: vitalsData.encounterId,
        bpSystolic: vitalsData.bpSystolic ? Number(vitalsData.bpSystolic) : null,
        bpDiastolic: vitalsData.bpDiastolic ? Number(vitalsData.bpDiastolic) : null,
        temperatureC: vitalsData.temperatureC ? Number(vitalsData.temperatureC) : null,
        pulseBpm: vitalsData.pulseBpm ? Number(vitalsData.pulseBpm) : null,
        weightKg: vitalsData.weightKg ? Number(vitalsData.weightKg) : null,
        heightCm: vitalsData.heightCm ? Number(vitalsData.heightCm) : null,
      };

      const res = await fetch("http://localhost:4000/api/records/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).message || "Failed to record vitals");

      setVitalsData({ encounterId: "", bpSystolic: "", bpDiastolic: "", temperatureC: "", pulseBpm: "", weightKg: "", heightCm: "" });
      setActiveTab("history");
      fetchData();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-neutral-500">Loading EMR...</div>;
  if (!patient) return <div className="p-12 text-center text-neutral-500">Patient not found</div>;

  return (
    <ProtectedRoute allowedRoles={[Role.DOCTOR, Role.NURSE, Role.ADMIN]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Patient Header */}
        <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold uppercase">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{patient.firstName} {patient.lastName}</h2>
              <div className="flex gap-4 mt-1 text-sm text-neutral-500">
                <span>MRN: <span className="font-medium text-neutral-900">{patient.mrn}</span></span>
                <span>DOB: {new Date(patient.dob).toLocaleDateString()}</span>
                <span>Gender: {patient.gender}</span>
                <span>Blood: <span className="text-danger font-medium">{patient.bloodGroup || 'N/A'}</span></span>
              </div>
            </div>
          </div>
          <Link href={`/patients/${id}`} className="text-sm font-medium text-primary-600 hover:text-primary-700">
            &larr; Back to Profile
          </Link>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar Nav */}
          <aside className="lg:col-span-3 mb-6 lg:mb-0">
            <nav className="space-y-1">
              <button onClick={() => setActiveTab("history")} className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'history' ? 'bg-primary-50 text-primary-700' : 'text-neutral-900 hover:bg-neutral-50'}`}>
                Clinical History
              </button>
              {user?.role === Role.DOCTOR && (
                <button onClick={() => setActiveTab("new_encounter")} className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'new_encounter' ? 'bg-primary-50 text-primary-700' : 'text-neutral-900 hover:bg-neutral-50'}`}>
                  New SOAP Note
                </button>
              )}
              {(user?.role === Role.NURSE || user?.role === Role.DOCTOR) && (
                <button onClick={() => setActiveTab("vitals")} className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'vitals' ? 'bg-primary-50 text-primary-700' : 'text-neutral-900 hover:bg-neutral-50'}`}>
                  Record Vitals
                </button>
              )}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-9">
            {submitError && (
              <div className="mb-4 rounded-md bg-danger/10 p-4 text-sm font-medium text-danger">
                {submitError}
              </div>
            )}

            {/* View: Clinical History */}
            {activeTab === "history" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-neutral-900">Encounter History</h3>
                {history.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm ring-1 ring-neutral-200">
                    <p className="text-neutral-500">No clinical records found.</p>
                  </div>
                ) : (
                  history.map(encounter => (
                    <div key={encounter.id} className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 overflow-hidden">
                      <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-neutral-900">{new Date(encounter.encounterDate).toLocaleDateString()} at {new Date(encounter.encounterDate).toLocaleTimeString()}</p>
                          <p className="text-sm text-neutral-500">Dr. {encounter.doctor.user.lastName} ({encounter.doctor.designation})</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => loadEncounterHistory(encounter.id)} className="text-xs font-medium text-neutral-500 hover:text-primary-600">
                            {showHistoryFor === encounter.id ? "Hide History" : "View Edit History"}
                          </button>
                          {(user?.role === Role.DOCTOR || user?.role === Role.ADMIN) && (
                            <button onClick={() => {
                              setEditingEncounterId(encounter.id);
                              setEditData({
                                chiefComplaint: encounter.chiefComplaint || "",
                                subjective: encounter.subjective || "",
                                objective: encounter.objective || "",
                                assessment: encounter.assessment || "",
                                plan: encounter.plan || ""
                              });
                            }} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                              Edit Note
                            </button>
                          )}
                          <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                            {encounter.status}
                          </span>
                        </div>
                      </div>

                      {/* Version History Dropdown */}
                      {showHistoryFor === encounter.id && historyLogs[encounter.id] && (
                        <div className="bg-warning/10 p-4 border-b border-warning/20">
                          <h4 className="text-sm font-bold text-warning-800 mb-3">Previous Versions (Immutable Log)</h4>
                          {historyLogs[encounter.id].length === 0 ? (
                            <p className="text-xs text-neutral-600">No previous versions. This record has not been edited.</p>
                          ) : (
                            <div className="space-y-4">
                              {historyLogs[encounter.id].map((log) => (
                                <div key={log.id} className="bg-white rounded-md p-3 shadow-sm text-sm ring-1 ring-warning/30">
                                  <div className="text-xs text-neutral-500 mb-2 border-b border-neutral-100 pb-2">
                                    Version from {new Date(log.createdAt).toLocaleString()} by {log.user.firstName} {log.user.lastName} ({log.user.role})
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div><strong className="text-neutral-700">Subjective:</strong> {log.beforeJson.subjective || '—'}</div>
                                    <div><strong className="text-neutral-700">Objective:</strong> {log.beforeJson.objective || '—'}</div>
                                    <div><strong className="text-neutral-700">Assessment:</strong> {log.beforeJson.assessment || '—'}</div>
                                    <div><strong className="text-neutral-700">Plan:</strong> {log.beforeJson.plan || '—'}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Display Data / Edit Form */}
                      <div className="p-6 space-y-6">
                        {editingEncounterId === encounter.id ? (
                          <form onSubmit={handleUpdateEncounter} className="space-y-4 border border-primary-200 bg-primary-50/50 p-4 rounded-lg">
                            <h4 className="text-sm font-bold text-primary-800">Editing Clinical Note</h4>
                            <p className="text-xs text-neutral-500 mb-4">Changes will be logged in the immutable audit trail.</p>
                            
                            <div>
                              <label className="block text-xs font-medium text-neutral-700">Chief Complaint</label>
                              <input required type="text" className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm sm:text-sm"
                                value={editData.chiefComplaint} onChange={e => setEditData({...editData, chiefComplaint: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-neutral-700">Subjective</label>
                                <textarea rows={3} className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm sm:text-sm"
                                  value={editData.subjective} onChange={e => setEditData({...editData, subjective: e.target.value})} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-700">Objective</label>
                                <textarea rows={3} className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm sm:text-sm"
                                  value={editData.objective} onChange={e => setEditData({...editData, objective: e.target.value})} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-700">Assessment</label>
                                <textarea rows={3} className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm sm:text-sm"
                                  value={editData.assessment} onChange={e => setEditData({...editData, assessment: e.target.value})} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-700">Plan</label>
                                <textarea rows={3} className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm sm:text-sm"
                                  value={editData.plan} onChange={e => setEditData({...editData, plan: e.target.value})} />
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                              <button type="button" onClick={() => setEditingEncounterId(null)} className="px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900">Cancel</button>
                              <button type="submit" disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">Save Changes</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            {encounter.chiefComplaint && (
                              <div>
                                <h4 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-2">Chief Complaint</h4>
                                <p className="text-sm text-neutral-900 bg-neutral-50 p-3 rounded-lg border border-neutral-100">{encounter.chiefComplaint}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-2">Subjective</h4>
                                <p className="text-sm text-neutral-900 whitespace-pre-wrap">{encounter.subjective || '—'}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-2">Objective</h4>
                                <p className="text-sm text-neutral-900 whitespace-pre-wrap">{encounter.objective || '—'}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-2">Assessment</h4>
                                <p className="text-sm text-neutral-900 whitespace-pre-wrap">{encounter.assessment || '—'}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-2">Plan</h4>
                                <p className="text-sm text-neutral-900 whitespace-pre-wrap">{encounter.plan || '—'}</p>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Display Vitals if recorded during this encounter */}
                        {encounter.vitals.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-neutral-200">
                            <h4 className="text-xs font-bold uppercase text-neutral-500 tracking-wider mb-4">Vitals Recorded</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {encounter.vitals.map((v: any) => (
                                <div key={v.id} className="bg-primary-50 rounded-lg p-3">
                                  <div className="text-xs text-primary-600 mb-1">{new Date(v.recordedAt).toLocaleTimeString()}</div>
                                  {v.bpSystolic && <div className="text-sm font-medium">BP: {v.bpSystolic}/{v.bpDiastolic}</div>}
                                  {v.temperatureC && <div className="text-sm font-medium">Temp: {v.temperatureC}°C</div>}
                                  {v.pulseBpm && <div className="text-sm font-medium">Pulse: {v.pulseBpm} bpm</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* View: New Encounter SOAP */}
            {activeTab === "new_encounter" && (
              <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 p-6">
                <h3 className="text-xl font-bold text-neutral-900 mb-6">New Clinical Encounter</h3>
                <form onSubmit={handleCreateEncounter} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Chief Complaint <span className="text-danger">*</span></label>
                    <input required type="text" className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      value={soapData.chiefComplaint} onChange={e => setSoapData({...soapData, chiefComplaint: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Subjective (Symptoms, Patient History)</label>
                      <textarea rows={3} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={soapData.subjective} onChange={e => setSoapData({...soapData, subjective: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Objective (Observations, Exam Findings)</label>
                      <textarea rows={3} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={soapData.objective} onChange={e => setSoapData({...soapData, objective: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Assessment (Diagnosis, Impressions)</label>
                      <textarea rows={3} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={soapData.assessment} onChange={e => setSoapData({...soapData, assessment: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Plan (Treatment, Prescriptions, Follow-up)</label>
                      <textarea rows={3} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={soapData.plan} onChange={e => setSoapData({...soapData, plan: e.target.value})} />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-70">
                      {isSubmitting ? "Saving Note..." : "Save Encounter"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* View: Record Vitals */}
            {activeTab === "vitals" && (
              <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-200 p-6">
                <h3 className="text-xl font-bold text-neutral-900 mb-6">Record Patient Vitals</h3>
                <form onSubmit={handleRecordVitals} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Attach to Encounter <span className="text-danger">*</span></label>
                    <select required className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white"
                      value={vitalsData.encounterId} onChange={e => setVitalsData({...vitalsData, encounterId: e.target.value})}>
                      <option value="">-- Select Active Encounter --</option>
                      {history.filter(h => h.status === 'IN_PROGRESS').map(h => (
                        <option key={h.id} value={h.id}>{new Date(h.encounterDate).toLocaleDateString()} - Dr. {h.doctor.user.lastName}</option>
                      ))}
                    </select>
                    {history.filter(h => h.status === 'IN_PROGRESS').length === 0 && (
                      <p className="mt-1 text-xs text-danger">No active encounters found. A doctor must create an encounter first.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Blood Pressure (Systolic)</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" className="block w-full rounded-none rounded-l-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="120"
                          value={vitalsData.bpSystolic} onChange={e => setVitalsData({...vitalsData, bpSystolic: e.target.value})} />
                        <span className="inline-flex items-center rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">mmHg</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Blood Pressure (Diastolic)</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" className="block w-full rounded-none rounded-l-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="80"
                          value={vitalsData.bpDiastolic} onChange={e => setVitalsData({...vitalsData, bpDiastolic: e.target.value})} />
                        <span className="inline-flex items-center rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">mmHg</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Heart Rate (Pulse)</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" className="block w-full rounded-none rounded-l-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="72"
                          value={vitalsData.pulseBpm} onChange={e => setVitalsData({...vitalsData, pulseBpm: e.target.value})} />
                        <span className="inline-flex items-center rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">bpm</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Temperature</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" step="0.1" className="block w-full rounded-none rounded-l-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="37.0"
                          value={vitalsData.temperatureC} onChange={e => setVitalsData({...vitalsData, temperatureC: e.target.value})} />
                        <span className="inline-flex items-center rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">°C</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Weight</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="number" step="0.1" className="block w-full rounded-none rounded-l-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="70"
                          value={vitalsData.weightKg} onChange={e => setVitalsData({...vitalsData, weightKg: e.target.value})} />
                        <span className="inline-flex items-center rounded-r-md border border-l-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">kg</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isSubmitting || !vitalsData.encounterId} className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-70">
                      {isSubmitting ? "Recording..." : "Record Vitals"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
