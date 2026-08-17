import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users, Clock, Layers, TrendingUp, BarChart2, CheckCircle2,
  Copy, UserPlus, Download, Archive, ChevronRight, ChevronDown,
  Plus, Edit2, Activity, Target, ArrowLeft, RefreshCw, AlertCircle, Trash2, X
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner } from '../../components/ui.jsx';

const TABS = ['Overview', 'Phases & Exercises', 'Assigned Patients'];

export default function ProgramOverviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = useSelector(s => s.auth?.accessToken);

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [toast, setToast] = useState(null);

  const showToastMsg = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProgramDetail(token, id);
      if (res?.data) {
        setProgram(res.data);
      } else {
        throw new Error('Program details not found.');
      }
    } catch (err) {
      console.error('Failed to load program:', err);
      setError(err.message || 'Failed to load rehabilitation program.');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAssignModal = async () => {
    setShowAssignModal(true);
    try {
      const res = await api.listPatients(token, { limit: 100 });
      if (res?.data) setPatients(res.data);
    } catch (err) {
      console.error('Failed to load patients for assignment:', err);
    }
  };

  const handleAssignPatient = async () => {
    if (!selectedPatientId) return;
    setSubmittingAssign(true);
    try {
      await api.assignProgram(token, id, { patientId: selectedPatientId });
      showToastMsg('Program successfully assigned to patient!');
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to assign program.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  if (loading) return <Spinner />;

  if (error || !program) {
    return (
      <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-red-800">Failed to Load Program</h2>
        <p className="text-xs text-red-600">{error}</p>
        <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const durationWeeks = program.durationWeeks || 8;
  const phases = program.phases || [];
  const exercisesCount = phases.reduce((sum, ph) => sum + (ph.exercises?.length || 0), 0);

  return (
    <div className="space-y-6 animate-fade-up text-slate-800 max-w-[1380px] mx-auto pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── PAGE HEADER ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <button onClick={() => navigate('/programs')} className="hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft size={13} /> Programs
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{program.title}</h1>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full border border-blue-200 uppercase">
                ● {program.status || 'PUBLISHED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">{program.description || 'Clinical rehabilitation protocol.'}</p>
          </div>

          <button
            onClick={openAssignModal}
            className="btn btn-primary text-xs flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
          >
            <UserPlus size={14} /> Assign Patient
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Duration</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{durationWeeks} Weeks</div>
          </div>

          <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Difficulty</div>
            <div className="text-xl font-extrabold text-blue-600 mt-0.5">{program.difficulty || 'Intermediate'}</div>
          </div>

          <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Phases</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{phases.length || 1} Phases</div>
          </div>

          <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Target Condition</div>
            <div className="text-sm font-extrabold text-slate-900 mt-1 truncate">{program.condition || 'Spine Care'}</div>
          </div>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="border-b border-slate-200 flex gap-2 text-xs">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT ─── */}
      {activeTab === 'Overview' && (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Program Guidelines & Target Outcomes</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {program.description || 'This rehabilitation program outlines progressive movement therapy, gradual resistance loading, and recovery milestones for functional recovery.'}
          </p>
        </div>
      )}

      {activeTab === 'Phases & Exercises' && (
        <div className="space-y-4">
          {phases.length > 0 ? (
            phases.map((ph, idx) => (
              <div key={idx} className="card p-6 bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{ph.name || `Phase ${idx + 1}`}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{ph.description || `Weeks ${ph.startWeek || idx * 2 + 1} - ${ph.endWeek || (idx + 1) * 2}`}</p>
                  </div>
                  <span className="badge badge-blue text-[10px]">{ph.exercises?.length || 0} Exercises</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(ph.exercises || []).map((ex, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{ex.name || 'Exercise Movement'}</div>
                        <div className="text-[10px] text-slate-400">{ex.sets ? `${ex.sets} sets × ${ex.reps || 10} reps` : 'Daily'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="card p-8 bg-white border border-slate-200 text-center text-xs text-slate-400">
              No detailed phases configured for this protocol.
            </div>
          )}
        </div>
      )}

      {activeTab === 'Assigned Patients' && (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Enrolled Patients</h3>
          <p className="text-xs text-slate-500">Patients undergoing active rehabilitation under this pathway.</p>
          <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
            Use the "Assign Patient" action above to enroll active clinical cases.
          </div>
        </div>
      )}

      {/* ─── ASSIGN MODAL ─── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-up text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Assign Program to Patient</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Patient</label>
              <select
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="select w-full"
              >
                <option value="">Choose Patient...</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.phoneNumber || p.email || 'Patient'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowAssignModal(false)} className="btn btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={handleAssignPatient}
                disabled={submittingAssign || !selectedPatientId}
                className="btn btn-primary text-xs"
              >
                {submittingAssign ? 'Assigning...' : 'Assign Program'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
