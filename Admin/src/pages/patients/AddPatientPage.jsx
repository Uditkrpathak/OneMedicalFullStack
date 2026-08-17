import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import {
  ArrowLeft, User, Phone, Mail, Calendar, FileText,
  CheckCircle2, Stethoscope, Camera, AlertCircle, Sparkles,
  UploadCloud, X, ShieldAlert, Heart, Activity, Check, MapPin
} from 'lucide-react';

const CONDITIONS = [
  'ACL Rehabilitation',
  'Lower Back Pain',
  'Frozen Shoulder',
  'Knee Replacement Rehab',
  'Plantar Fasciitis',
  'Cervical Spondylosis',
  'Rotator Cuff Injury',
  'Lumbar Disc Herniation',
  'Sports Injury Rehab',
  'Post-Surgery Physical Therapy',
  'Other Condition',
];

const PRESET_AVATARS = [
  { label: 'Patient 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { label: 'Patient 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Patient 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
  { label: 'Patient 4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
];

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
    {children}{required && <span className="text-rose-500 ml-1 font-bold">*</span>}
  </label>
);

const SectionCard = ({ title, icon: Icon, badge, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-6 transition-all hover:border-slate-300">
    <div className="flex items-center justify-between px-6 py-4 bg-slate-50/70 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-xs">
          <Icon size={16} />
        </div>
        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">{title}</h2>
      </div>
      {badge && (
        <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

export default function AddPatientPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const currentUser = useSelector(s => s.auth?.user);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [therapists, setTherapists] = useState([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    dob: '',
    gender: 'Male',
    height: '172',
    weight: '68',
    therapistId: '',
    quickNotes: '',
    address: 'Indiranagar, Bangalore',
    emergencyName: '',
    emergencyRelation: 'Spouse',
    emergencyPhone: '',
    condition: 'ACL Rehabilitation',
    painLevel: 4,
    avatarUrl: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const res = await api.listTherapists(token);
        if (res?.data) {
          setTherapists(res.data);
          if (res.data.length > 0 && !form.therapistId) {
            setForm(p => ({ ...p, therapistId: res.data[0]._id || res.data[0].id || res.data[0].userId }));
          }
        }
      } catch (err) {
        console.error('Failed to load specialists:', err);
      }
    };
    fetchTherapists();
  }, [token]);

  const set = field => e => setForm(p => ({ ...p, [field]: e.target.value }));

  // Handle local file image upload
  const handleImageFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setFormError('Image size exceeds 3MB limit. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      setForm(p => ({ ...p, avatarUrl: ev.target.result }));
      setFormError(null);
    };
    reader.readAsDataURL(file);
  };

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birth = new Date(dobString);
    if (isNaN(birth.getTime())) return null;
    const diffMs = Date.now() - birth.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError(null);

    if (!form.firstName.trim() || !form.mobile.trim()) {
      setFormError('First name and mobile number are required.');
      return;
    }

    const nameRegex = /^[a-zA-Z\s.-]+$/;
    if (!nameRegex.test(form.firstName.trim()) || (form.lastName && !nameRegex.test(form.lastName.trim()))) {
      setFormError('Names can only contain letters, spaces, dots, or hyphens.');
      return;
    }

    const digitsOnly = form.mobile.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      setFormError('Please provide a valid 10-15 digit contact number.');
      return;
    }

    if (form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setFormError('Please enter a valid email address.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const payload = {
        name: fullName,
        phoneNumber: form.mobile.startsWith('+') ? form.mobile : `+91 ${form.mobile.replace(/^\+?91/, '').trim()}`,
        email: form.email || undefined,
        dob: form.dob || undefined,
        gender: form.gender ? form.gender.toLowerCase() : 'other',
        weight: Number(form.weight) || 65,
        height: Number(form.height) || 170,
        address: form.address || undefined,
        profileImageUrl: form.avatarUrl || undefined,
        avatarUrl: form.avatarUrl || undefined,
        primaryConcern: form.condition,
        role: 'patient',
        profile: {
          primaryConcern: form.condition,
          assignedTherapistId: form.therapistId,
          recoveryScore: 70,
          quickNotes: form.quickNotes,
          profileImageUrl: form.avatarUrl || undefined,
          emergencyContact: {
            name: form.emergencyName || '',
            relation: form.emergencyRelation || 'Family',
            phone: form.emergencyPhone || '',
          },
        },
      };

      await api.createPatient(token, payload);
      setToastMessage(`Patient ${fullName} enrolled successfully!`);
      setTimeout(() => {
        navigate('/patients');
      }, 900);
    } catch (err) {
      console.error('Create patient error:', err);
      setFormError(err.message || 'Failed to create patient profile on the server.');
      setSubmitting(false);
    }
  };

  const selectedTherapist = therapists.find(t => (t._id || t.id || t.userId) === form.therapistId);
  const fullName = `${form.firstName} ${form.lastName}`.trim() || 'New Patient';
  const patientAge = calculateAge(form.dob);

  const getPainLevelInfo = level => {
    if (level <= 2) return { text: 'Mild Pain', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (level <= 5) return { text: 'Moderate Discomfort', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
    if (level <= 8) return { text: 'Severe Pain', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { text: 'Acute / Critical', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
  };

  const painInfo = getPainLevelInfo(form.painLevel);

  return (
    <div className="space-y-6 pb-12 animate-fade-up max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold border border-slate-800 animate-fade-up">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/patients')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-700 mb-2 transition-colors group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Patient Roster
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Add New Patient</h1>
          <p className="text-xs text-slate-500 mt-0.5">Register a patient profile and assign their personalized rehabilitation program.</p>
        </div>


      </div>

      {formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-3">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span className="font-semibold">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">

          {/* LEFT COLUMN: FORM SECTIONS */}
          <div>
            {/* 1. PERSONAL INFORMATION */}
            <SectionCard title="Personal & Identity Details" icon={User} badge="Required">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>First Name</Label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="e.g. Rahul"
                    value={form.firstName}
                    onChange={set('firstName')}
                    required
                  />
                </div>

                <div>
                  <Label required>Last Name</Label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="e.g. Sharma"
                    value={form.lastName}
                    onChange={set('lastName')}
                    required
                  />
                </div>

                <div>
                  <Label required>Mobile Number</Label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                      placeholder="+91 98765 43210"
                      value={form.mobile}
                      onChange={set('mobile')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                      type="email"
                      placeholder="patient@example.com"
                      value={form.email}
                      onChange={set('email')}
                    />
                  </div>
                </div>

                <div>
                  <Label>Assigned Specialist</Label>
                  <div className="relative">
                    <Stethoscope size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                      value={form.therapistId}
                      onChange={set('therapistId')}
                    >
                      {therapists.length === 0 ? (
                        <option value="">Loading specialists...</option>
                      ) : (
                        therapists.map(t => (
                          <option key={t._id || t.id || t.userId} value={t._id || t.id || t.userId}>
                            {t.name || t.user?.name || 'Dr. Specialist'} • {t.specializations?.[0] || 'Physiotherapy'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Date of Birth</Label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                      type="date"
                      value={form.dob}
                      onChange={set('dob')}
                    />
                  </div>
                </div>

                <div>
                  <Label>Gender</Label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    value={form.gender}
                    onChange={set('gender')}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <Label>Residential Address / City</Label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                      placeholder="Indiranagar, Bangalore"
                      value={form.address}
                      onChange={set('address')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 col-span-1 sm:col-span-2">
                  <div>
                    <Label>Height (cm)</Label>
                    <input
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                      type="number"
                      placeholder="172"
                      value={form.height}
                      onChange={set('height')}
                    />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <input
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                      type="number"
                      placeholder="68"
                      value={form.weight}
                      onChange={set('weight')}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* 2. CLINICAL & MEDICAL DETAILS */}
            <SectionCard title="Clinical Condition & Assessment" icon={Activity} badge="Clinical">
              <div className="space-y-4">
                <div>
                  <Label>Primary Rehabilitation Condition</Label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    value={form.condition}
                    onChange={set('condition')}
                  >
                    {CONDITIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* PAIN SCORE SLIDER */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900">Baseline Pain Score</span>
                      <p className="text-[11px] text-slate-400">Patient reported discomfort on a 0–10 scale</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-extrabold rounded-full border ${painInfo.bg} ${painInfo.color} ${painInfo.border}`}>
                      Score: {form.painLevel}/10 • {painInfo.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-bold text-emerald-600">0 (None)</span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={form.painLevel}
                      onChange={e => setForm(p => ({ ...p, painLevel: Number(e.target.value) }))}
                      className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <span className="text-xs font-bold text-rose-600">10 (Extreme)</span>
                  </div>
                </div>

                <div>
                  <Label>Clinical Notes & Recommendations</Label>
                  <textarea
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all h-24 resize-none"
                    placeholder="Document mobility restrictions, previous surgery date, ROM limitations, or treatment protocols..."
                    value={form.quickNotes}
                    onChange={set('quickNotes')}
                  />
                </div>
              </div>
            </SectionCard>

            {/* 3. EMERGENCY CONTACT */}
            <SectionCard title="Emergency & Caregiver Contact" icon={ShieldAlert} badge="Safety">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="e.g. Priya Sharma"
                    value={form.emergencyName}
                    onChange={set('emergencyName')}
                  />
                </div>

                <div>
                  <Label>Relationship</Label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    value={form.emergencyRelation}
                    onChange={set('emergencyRelation')}
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend / Caregiver</option>
                  </select>
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="+91 98765 00000"
                    value={form.emergencyPhone}
                    onChange={set('emergencyPhone')}
                  />
                </div>
              </div>
            </SectionCard>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#003882] hover:bg-[#002b66] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>{submitting ? 'Enrolling Patient...' : 'Enroll Patient Profile'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: STICKY PHOTO UPLOADER & LIVE PREVIEW */}
          <div className="sticky top-6 space-y-5">

            {/* 1. PHOTO UPLOADER CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 text-center">
              <div className="text-xs font-extrabold text-slate-900 mb-1">Patient Profile Photo</div>
              <p className="text-[11px] text-slate-400 mb-4">Upload a high-res photo or select from sample avatars.</p>

              {/* AVATAR DISPLAY */}
              <div className="relative w-28 h-28 mx-auto mb-4 group">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 group-hover:border-blue-500 bg-slate-50 flex items-center justify-center transition-all shadow-inner">
                  {form.avatarUrl ? (
                    <img
                      src={form.avatarUrl}
                      alt="Patient preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Camera size={26} className="mb-1" />
                      <span className="text-[10px] font-bold">No Photo</span>
                    </div>
                  )}
                </div>

                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, avatarUrl: '' }))}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
                    title="Remove Photo"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* UPLOAD BUTTON */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer mb-3"
              >
                <UploadCloud size={15} />
                <span>Upload From Device</span>
              </button>

              {/* PRESET AVATARS SELECTOR */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Or Choose Preset</div>
                <div className="flex items-center justify-center gap-2">
                  {PRESET_AVATARS.map((avatar, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, avatarUrl: avatar.url }))}
                      className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${form.avatarUrl === avatar.url ? 'border-blue-600 scale-110 shadow-md ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-400'
                        }`}
                    >
                      <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. LIVE PATIENT SUMMARY CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Roster Preview</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  NEW PATIENT
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-black text-base flex items-center justify-center overflow-hidden shrink-0 border border-blue-200">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="Live avatar" className="w-full h-full object-cover" />
                  ) : (
                    form.firstName?.[0] || 'P'
                  )}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900 leading-tight">
                    {fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {form.gender} {patientAge ? `• ${patientAge} yrs` : ''}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center justify-between text-slate-600 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Condition</span>
                  <span className="font-bold text-slate-800 text-right">{form.condition}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Contact</span>
                  <span className="font-bold text-slate-800">{form.mobile || '—'}</span>
                </div>

                {selectedTherapist && (
                  <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      <Stethoscope size={13} />
                    </div>
                    <div className="truncate">
                      <div className="text-[11px] font-bold text-blue-950 truncate">{selectedTherapist.name || selectedTherapist.user?.name}</div>
                      <div className="text-[10px] text-blue-700">Assigned Specialist</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </form>
    </div>
  );
}
