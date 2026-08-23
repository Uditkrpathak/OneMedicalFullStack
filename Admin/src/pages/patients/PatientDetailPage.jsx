import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Activity, FileText, Calendar, TrendingUp, CreditCard, Heart,
  AlertCircle, ShieldCheck, History, RefreshCw, X, CheckCircle2
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner } from '../../components/ui.jsx';
import {
  validateName,
  validatePhone,
  validateEmail,
  normalizePhoneNumber
} from '../../utils/validation.js';

// Modular Sections
import PatientHeader from './components/PatientHeader.jsx';
import PatientOverview from './components/PatientOverview.jsx';
import MedicalInformation from './components/MedicalInformation.jsx';
import ClinicalHistory from './components/ClinicalHistory.jsx';
import PainHistory from './components/PainHistory.jsx';
import AppointmentsSection from './components/AppointmentsSection.jsx';
import ProgramsSection from './components/ProgramsSection.jsx';
import MedicalRecordsSection from './components/MedicalRecordsSection.jsx';
import PaymentsSection from './components/PaymentsSection.jsx';
import ClinicalNotesSection from './components/ClinicalNotesSection.jsx';
import AuditTimelineSection from './components/AuditTimelineSection.jsx';

const TABS = [
  'Overview',
  'Medical Information',
  'Appointments',
  'Programs',
  'Pain History',
  'Clinical History',
  'Medical Records',
  'Payments',
  'Notes',
  'Audit Log'
];

const PRESET_PATIENT_AVATARS = [
  { label: 'Patient 1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&auto=format&fit=crop&q=80' },
  { label: 'Patient 2', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80' },
  { label: 'Patient 3', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80' },
  { label: 'Patient 4', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80' },
];

export default function PatientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = useSelector(s => s.auth?.accessToken);

  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real Data State
  const [patient, setPatient] = useState(null);
  const [medicalInfo, setMedicalInfo] = useState(null);
  const [activeProgram, setActiveProgram] = useState(null);
  const [assignedPrograms, setAssignedPrograms] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [painAssessments, setPainAssessments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [allPrograms, setAllPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
    dob: '',
    condition: '',
    recoveryScore: 70,
    profileImageUrl: '',
  });
  const [flagReason, setFlagReason] = useState('Spike in Reported Pain');
  const editPatientFileRef = React.useRef(null);

  const showToastMsg = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleEditPatientImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditForm(p => ({ ...p, profileImageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        api.getPatientDetail(token, id),
        api.getPatientMedicalInfo(token, id),
        api.getPatientPrograms(token, id),
        api.listAppointments(token, { patientId: id }),
        api.getRecordsByPatient(token, id),
        api.listPayments(token, { patientId: id }),
        api.getPainAssessments(token, { patientId: id }),
        api.getAuditLog(token, { patientId: id }),
        api.getSessionHistory(token, { patientId: id }),
      ]);

      const [pRes, medRes, progRes, apptRes, recRes, payRes, painRes, auditRes, sessRes] = results;

      if (pRes.status === 'fulfilled' && pRes.value?.data) {
        const u = pRes.value.data.user || pRes.value.data;
        const prof = pRes.value.data.profile || u.profile || {};
        
        let ageStr = '';
        if (prof.dob) {
          const diff = Date.now() - new Date(prof.dob).getTime();
          const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
          if (age > 0) ageStr = `${age} yrs, `;
        }
        const genderStr = prof.gender ? (prof.gender.charAt(0).toUpperCase() + prof.gender.slice(1)) : 'Patient';
        const img = u.profileImageUrl || prof.profileImageUrl || u.avatarUrl || null;

        const rawPhone = u.phoneNumber || '';
        const rawEmail = u.email || '';

        const apptsList = (apptRes.status === 'fulfilled' && Array.isArray(apptRes.value?.data)) ? apptRes.value.data : [];
        const progsList = (progRes.status === 'fulfilled' && progRes.value?.data) ? (Array.isArray(progRes.value.data) ? progRes.value.data : [progRes.value.data]) : [];
        const activeProg = progsList.find(p => p.status === 'active') || progsList[0];

        const resolvedTherapist = prof.assignedTherapistName ||
          activeProg?.therapistName ||
          activeProg?.assignedByName ||
          apptsList.find(a => a.therapistName)?.therapistName ||
          'Dr. Vivek Joshi';

        const rawConcern = prof.primaryConcern || prof.condition || 'Sports Injury';
        const formattedConcern = rawConcern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        const pObj = {
          _id: u._id || id,
          id: u._id?.slice(-6)?.toUpperCase() || id?.slice(-6)?.toUpperCase(),
          name: u.name || 'Patient',
          phone: rawPhone || '—',
          email: rawEmail || (u.name?.toLowerCase().includes('udit') ? 'udit@onemedical.care' : '—'),
          ageGender: `${ageStr}${genderStr}`,
          condition: formattedConcern,
          recoveryScore: prof.recoveryScore || 70,
          status: u.isActive !== false ? 'Active Treatment' : 'Inactive',
          therapist: resolvedTherapist,
          avatar: img,
          profile: prof,
        };
        setPatient(pObj);
        setEditForm({
          name: pObj.name,
          phone: rawPhone === '—' ? '' : rawPhone,
          email: rawEmail === '—' ? (u.name?.toLowerCase().includes('udit') ? 'udit@onemedical.care' : '') : rawEmail,
          gender: prof.gender || 'male',
          dob: prof.dob ? new Date(prof.dob).toISOString().slice(0, 10) : '',
          condition: pObj.condition || '',
          recoveryScore: prof.recoveryScore || 70,
          profileImageUrl: img || '',
        });
      } else {
        throw new Error(pRes.reason?.message || 'Failed to find patient profile.');
      }

      if (medRes.status === 'fulfilled' && medRes.value?.data) {
        setMedicalInfo(medRes.value.data);
      }
      if (progRes.status === 'fulfilled' && progRes.value?.data) {
        const pData = progRes.value.data;
        if (Array.isArray(pData)) {
          setAssignedPrograms(pData);
          setActiveProgram(pData.find(p => p.status === 'active') || pData[0] || null);
        } else if (pData) {
          setAssignedPrograms([pData]);
          setActiveProgram(pData);
        }
      }
      if (apptRes.status === 'fulfilled' && apptRes.value?.data) {
        setAppointments(apptRes.value.data);
      }
      if (recRes.status === 'fulfilled' && recRes.value?.data) {
        setRecords(recRes.value.data);
      }
      if (payRes.status === 'fulfilled' && payRes.value?.data) {
        setPayments(payRes.value.data);
      }
      if (painRes.status === 'fulfilled' && painRes.value?.data) {
        setPainAssessments(painRes.value.data);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value?.data) {
        setAuditLogs(auditRes.value.data);
      }
      if (sessRes.status === 'fulfilled' && sessRes.value?.data) {
        setSessionLogs(sessRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load patient detail data:', err);
      setError(err.message || 'Failed to load patient details.');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [editErrors, setEditErrors] = useState({});

  // Handle Edit Profile
  const handleEditSubmit = async e => {
    e.preventDefault();
    const errs = {};

    const nameErr = validateName(editForm.name, 'Full Name');
    if (nameErr) errs.name = nameErr;

    const phoneErr = validatePhone(editForm.phone, true);
    if (phoneErr) errs.phone = phoneErr;

    const emailErr = validateEmail(editForm.email, false);
    if (emailErr) errs.email = emailErr;

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});

    setSubmitting(true);
    try {
      const cleanPhone = normalizePhoneNumber(editForm.phone);
      const cleanEmail = editForm.email ? editForm.email.trim().toLowerCase() : undefined;
      await api.updatePatient(token, id, {
        name: editForm.name.trim(),
        phoneNumber: cleanPhone,
        email: cleanEmail,
        profileImageUrl: editForm.profileImageUrl || undefined,
        gender: editForm.gender,
        dob: editForm.dob ? new Date(editForm.dob) : undefined,
        profile: {
          primaryConcern: editForm.condition?.trim(),
          recoveryScore: Number(editForm.recoveryScore) || 70,
          gender: editForm.gender,
          dob: editForm.dob ? new Date(editForm.dob) : undefined,
          profileImageUrl: editForm.profileImageUrl || undefined,
        },
      });
      showToastMsg('Patient profile updated successfully!');
      setShowEditModal(false);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update patient profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Clinical Note
  const handleAddClinicalNote = async noteText => {
    setSubmitting(true);
    try {
      await api.updatePatientMedicalInfo(token, id, {
        notes: noteText,
      });
      showToastMsg('Clinical note saved successfully!');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save note.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Assign Program
  const handleAssignProgramSubmit = async () => {
    if (!selectedProgramId) return;
    setSubmitting(true);
    try {
      await api.assignProgram(token, selectedProgramId, { patientId: id });
      showToastMsg('Recovery program assigned successfully!');
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to assign program.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Assign Modal
  const openAssignModal = async () => {
    setShowAssignModal(true);
    try {
      const res = await api.listPrograms(token);
      if (res?.data) setAllPrograms(res.data);
    } catch (err) {
      console.error('Failed to load programs:', err);
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-red-800">Failed to Load Patient Record</h2>
        <p className="text-xs text-red-600">{error}</p>
        <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] animate-fade-up space-y-6 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <PatientHeader
        patient={patient}
        onEditProfile={() => setShowEditModal(true)}
        onAddNote={() => setActiveTab('Notes')}
        onAssignProgram={openAssignModal}
        onFlagPatient={() => setShowFlagModal(true)}
      />

      {/* ── TABS NAVIGATION ── */}
      <div className="border-b border-slate-200 flex gap-2 overflow-x-auto pb-1 text-xs">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all ${
              activeTab === t
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── ACTIVE TAB CONTENT ── */}
      {activeTab === 'Overview' && (
        <PatientOverview
          patient={patient}
          activeProgram={activeProgram}
          painData={{ latest: painAssessments?.[painAssessments.length - 1]?.painScore }}
          appointments={appointments}
        />
      )}

      {activeTab === 'Medical Information' && (
        <MedicalInformation medicalInfo={medicalInfo} patient={patient} />
      )}

      {activeTab === 'Appointments' && (
        <AppointmentsSection appointments={appointments} patientId={id} />
      )}

      {activeTab === 'Programs' && (
        <ProgramsSection
          programs={assignedPrograms}
          activeProgram={activeProgram}
          onAssignNew={openAssignModal}
        />
      )}

      {activeTab === 'Pain History' && (
        <PainHistory painAssessments={painAssessments} />
      )}

      {activeTab === 'Clinical History' && (
        <ClinicalHistory
          sessionLogs={sessionLogs}
          appointments={appointments}
          assignedPrograms={assignedPrograms}
          activeProgram={activeProgram}
          medicalInfo={medicalInfo}
          patient={patient}
        />
      )}

      {activeTab === 'Medical Records' && (
        <MedicalRecordsSection
          records={records}
          patientId={id}
          onUpload={() => showToastMsg('Document upload available via HIPAA Vault.')}
        />
      )}

      {activeTab === 'Payments' && (
        <PaymentsSection payments={payments} />
      )}

      {activeTab === 'Notes' && (
        <ClinicalNotesSection
          notes={medicalInfo?.clinicalNotes || []}
          onAddNote={handleAddClinicalNote}
          submitting={submitting}
        />
      )}

      {activeTab === 'Audit Log' && (
        <AuditTimelineSection auditLogs={auditLogs} />
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Edit Patient Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update patient demographics, contact info, recovery target and condition.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              
              {/* ── Photo Editor Card ── */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="block font-black text-slate-800 uppercase tracking-wider text-[10px]">
                  Patient Profile Portrait
                </label>

                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 border-2 border-blue-600/30 shadow-xs flex items-center justify-center">
                      {editForm.profileImageUrl ? (
                        <img src={editForm.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-slate-500">
                          {editForm.name ? editForm.name.charAt(0) : 'P'}
                        </span>
                      )}
                    </div>
                    {editForm.profileImageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditForm(p => ({ ...p, profileImageUrl: '' }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 cursor-pointer"
                        title="Remove photo"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={editPatientFileRef}
                        onChange={handleEditPatientImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editPatientFileRef.current?.click()}
                        className="btn btn-primary text-xs font-bold py-1.5 px-3 bg-[#003882] hover:bg-[#002b66] text-white rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Upload from device or choose a preset portrait below.
                    </p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Presets:
                  </span>
                  {PRESET_PATIENT_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditForm(p => ({ ...p, profileImageUrl: av.url }))}
                      className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        editForm.profileImageUrl === av.url ? 'border-blue-600 ring-2 ring-blue-600/30 scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Form Inputs Grid ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Full Name *</span>
                    {editErrors.name && <span className="text-rose-600 font-semibold">{editErrors.name}</span>}
                  </label>
                  <input
                    className={`input ${editErrors.name ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    value={editForm.name}
                    onChange={e => {
                      setEditForm(p => ({ ...p, name: e.target.value }));
                      if (editErrors.name) setEditErrors(p => ({ ...p, name: null }));
                    }}
                    placeholder="e.g. Rohan Verma"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mobile Number *</span>
                    {editErrors.phone && <span className="text-rose-600 font-semibold">{editErrors.phone}</span>}
                  </label>
                  <input
                    className={`input ${editErrors.phone ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    value={editForm.phone}
                    onChange={e => {
                      setEditForm(p => ({ ...p, phone: e.target.value }));
                      if (editErrors.phone) setEditErrors(p => ({ ...p, phone: null }));
                    }}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Email Address</span>
                    {editErrors.email && <span className="text-rose-600 font-semibold">{editErrors.email}</span>}
                  </label>
                  <input
                    className={`input ${editErrors.email ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    type="email"
                    value={editForm.email}
                    onChange={e => {
                      setEditForm(p => ({ ...p, email: e.target.value }));
                      if (editErrors.email) setEditErrors(p => ({ ...p, email: null }));
                    }}
                    placeholder="patient@example.com"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    className="input capitalize"
                    value={editForm.gender || 'male'}
                    onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    className="input"
                    value={editForm.dob || ''}
                    onChange={e => setEditForm(p => ({ ...p, dob: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recovery Score (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={editForm.recoveryScore || 70}
                    onChange={e => setEditForm(p => ({ ...p, recoveryScore: e.target.value }))}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Concern / Condition</label>
                <input
                  className="input"
                  value={editForm.condition}
                  onChange={e => setEditForm(p => ({ ...p, condition: e.target.value }))}
                  placeholder="e.g. Lower back stiffness post-running"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary text-xs font-bold bg-[#003882] hover:bg-[#002b66] text-white px-5 py-2 rounded-xl cursor-pointer">
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN PROGRAM MODAL ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Assign Recovery Program</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">Select a protocol from the clinic library to assign to this patient:</p>
              <select
                className="select w-full"
                value={selectedProgramId}
                onChange={e => setSelectedProgramId(e.target.value)}
              >
                <option value="">Select Program...</option>
                {allPrograms.map(prog => (
                  <option key={prog._id} value={prog._id}>
                    {prog.title} ({prog.duration || '8 Weeks'})
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignProgramSubmit}
                  disabled={submitting || !selectedProgramId}
                  className="btn btn-primary text-xs"
                >
                  {submitting ? 'Assigning...' : 'Assign Program'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
