import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  User, CheckCircle2, FileText, Plus, Bold, Italic,
  List, Link2, Clock, Save, Send, ChevronDown, Check, ArrowLeft, RefreshCw, AlertCircle
} from 'lucide-react';
import { UserAvatar, Spinner } from '../../components/ui.jsx';
import { api } from '../../api/api.js';

const TREATMENTS = [
  { key: 'manual', label: 'Manual Therapy', default: true },
  { key: 'stretching', label: 'Stretching', default: true },
  { key: 'strength', label: 'Strength Training', default: false },
  { key: 'mobility', label: 'Mobility Exercises', default: true },
  { key: 'electro', label: 'Electrotherapy', default: false },
  { key: 'dry', label: 'Dry Needling', default: false },
  { key: 'soft', label: 'Soft Tissue Release', default: false },
];

export default function SessionSummaryPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();
  const { id } = useParams();

  const [appointment, setAppointment] = useState(null);
  const [loadingAppt, setLoadingAppt] = useState(true);
  const [errorAppt, setErrorAppt] = useState(null);

  // Treatment toggles
  const [activeTreatments, setActiveTreatments] = useState(
    new Set(TREATMENTS.filter(t => t.default).map(t => t.key))
  );
  const toggleTreatment = (key) => {
    setActiveTreatments(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Clinical Notes & Patient Response
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [painBefore, setPainBefore] = useState(6);
  const [painAfter, setPainAfter] = useState(3);
  const [mobilityResponse, setMobilityResponse] = useState('Significant');
  const [strengthResponse, setStrengthResponse] = useState('Stable');
  const [homeInstructions, setHomeInstructions] = useState('Apply ice for 15 mins post-workout. Avoid heavy lifting.');

  // Follow-up Checklist
  const [checklist, setChecklist] = useState({
    hep: true, report: false, schedule: false, share: false
  });
  const toggleChecklist = (key) => setChecklist(p => ({ ...p, [key]: !p[key] }));

  // Submission state
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadAppointment = useCallback(async () => {
    if (!id) return;
    setLoadingAppt(true);
    setErrorAppt(null);
    try {
      const res = await api.getAppointmentDetail(token, id);
      if (res?.data) {
        setAppointment(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch appointment:', err);
      setErrorAppt(err.message || 'Failed to load appointment details.');
    } finally {
      setLoadingAppt(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      await api.saveSessionSummary(token, id, {
        treatments: [...activeTreatments],
        notes: clinicalNotes,
        draft: true,
      });
      showToast('Draft saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    setLoading(true);
    try {
      await api.saveSessionSummary(token, id, {
        treatments: [...activeTreatments],
        notes: clinicalNotes,
        painBefore, painAfter,
        mobilityResponse, strengthResponse,
        homeInstructions,
        checklist,
        complete: true,
      });
      await api.completeAppointment(token, id, {});
      showToast('Session summary recorded and appointment completed!');
      setTimeout(() => navigate(`/appointments/${id}`), 1400);
    } catch (err) {
      alert(err.message || 'Failed to complete session summary.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAppt) return <Spinner />;

  if (errorAppt) {
    return (
      <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-red-800">Failed to Load Appointment</h2>
        <p className="text-xs text-red-600">{errorAppt}</p>
        <button onClick={loadAppointment} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const startDate = appointment?.startTime ? new Date(appointment.startTime) : new Date();

  return (
    <div className="space-y-6 text-slate-800 animate-fade-up max-w-[1380px] mx-auto pb-16 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 size={15} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* ─── PAGE HEADER ─── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <button onClick={() => navigate(`/appointments/${id}`)} className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft size={13} /> Appointment #{id?.slice(-6)?.toUpperCase()}
          </button>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Session Summary & Notes</h1>
        <p className="text-xs text-slate-500 mt-1">Document completed treatment and evaluate patient progression.</p>
      </div>

      {/* ─── PATIENT INFO BANNER ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User size={17} />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900 leading-tight">{appointment?.patientName || 'Patient'}</div>
              <div className="text-[11px] text-slate-400 font-mono">#{appointment?.patientId?.slice(-6)?.toUpperCase()}</div>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-100 hidden sm:block" />

          <div className="flex flex-wrap gap-6 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SPECIALIST</div>
              <div className="font-bold text-slate-800 mt-0.5">{appointment?.therapistName || 'Dr. Specialist'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SESSION MODE</div>
              <div className="font-bold text-slate-800 mt-0.5">{appointment?.appointmentPlace || 'Clinic Visit'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DURATION</div>
              <div className="font-bold text-slate-800 mt-0.5">{appointment?.durationMin || 45} mins</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SCHEDULED AT</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} • {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. TREATMENT PERFORMED */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">Treatment Modalities Performed</h3>
            <div className="flex flex-wrap gap-2">
              {TREATMENTS.map(t => (
                <button
                  key={t.key}
                  onClick={() => toggleTreatment(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    activeTreatments.has(t.key)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                  {activeTreatments.has(t.key) && <Check size={12} />}
                </button>
              ))}
            </div>
          </div>

          {/* 2. CLINICAL OBSERVATIONS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">Clinical Observations & Findings</h3>
            <textarea
              value={clinicalNotes}
              onChange={e => setClinicalNotes(e.target.value)}
              placeholder="Record detailed objective findings, joint mobility, muscular activation patterns..."
              className="input h-32 text-xs resize-none"
            />
          </div>

          {/* 3. PATIENT RESPONSE & PAIN COMPARISON */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Pain Level Response (VAS 0–10)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Pre-Session Pain:</span>
                  <span className="text-amber-600">{painBefore} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painBefore}
                  onChange={e => setPainBefore(+e.target.value)}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Post-Session Pain:</span>
                  <span className="text-emerald-600">{painAfter} / 10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painAfter}
                  onChange={e => setPainAfter(+e.target.value)}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 4. HOME INSTRUCTIONS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">Prescribed Home Instructions</h3>
            <textarea
              value={homeInstructions}
              onChange={e => setHomeInstructions(e.target.value)}
              placeholder="Prescribe rest intervals, heat/ice protocols, daily routine guidelines..."
              className="input h-20 text-xs resize-none"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIONS */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4 text-xs">
            <h3 className="font-extrabold text-slate-900 uppercase tracking-wider">Save & Finalize</h3>

            <div className="space-y-2">
              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="btn btn-secondary w-full text-xs flex items-center justify-center gap-1.5"
              >
                <Save size={14} /> Save as Draft
              </button>

              <button
                onClick={handleCompleteSession}
                disabled={loading}
                className="btn btn-primary w-full text-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Complete Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
