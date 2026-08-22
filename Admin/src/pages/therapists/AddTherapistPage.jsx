import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import {
  ArrowLeft, User, Phone, Mail, Calendar, FileText,
  CheckCircle2, Stethoscope, Camera, AlertCircle, Save,
  ChevronDown, HelpCircle, ShieldCheck, Clock, Award,
  Upload, X, Sparkles, MapPin, IndianRupee
} from 'lucide-react';
import {
  validateName,
  validatePhone,
  validateEmail,
  validateDOB,
  validateFee,
  validateExperience,
  normalizePhoneNumber,
  sanitizeInput
} from '../../utils/validation.js';

const PRESET_AVATARS = [
  { label: 'Specialist 1', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80' },
  { label: 'Specialist 2', url: 'https://images.unsplash.com/photo-1594824813501-48e02d627c2e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Specialist 3', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=80' },
  { label: 'Specialist 4', url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80' },
];

export default function AddTherapistPage() {
  const token = useSelector(s => s.auth.accessToken);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    qualification: 'MPT - Orthopedics, BPT',
    specialization: 'Orthopedic Physiotherapy',
    experienceYears: '8',
    languages: 'English, Hindi',
    licenseNumber: 'MP-REG-2024-8921',
    consultationFee: '800',
    sessionDuration: '45 Minutes',
    availabilityType: 'Full-Time',
    onlineConsultation: true,
    homeVisitEnabled: false,
    practiceClinic: 'ONE MEDICAL Center, Indiranagar',
    bio: 'Dedicated orthopedic and musculoskeletal physical therapist with expertise in spine rehab and functional recovery.',
    systemRole: 'Medical Practitioner',
    accountStatus: true,
    photoUrl: PRESET_AVATARS[0].url,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const updateForm = f => e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [f]: value }));
    if (errors[f]) {
      setErrors(prev => ({ ...prev, [f]: null }));
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be under 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm(p => ({ ...p, photoUrl: reader.result }));
      showToast('Doctor portrait uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  const validateAllFields = () => {
    const newErrors = {};

    const fnErr = validateName(form.firstName, 'First Name');
    if (fnErr) newErrors.firstName = fnErr;

    const lnErr = validateName(form.lastName, 'Last Name');
    if (lnErr) newErrors.lastName = lnErr;

    const phoneErr = validatePhone(form.phone, true);
    if (phoneErr) newErrors.phone = phoneErr;

    const emailErr = validateEmail(form.email, true);
    if (emailErr) newErrors.email = emailErr;

    if (form.dob) {
      const dobErr = validateDOB(form.dob, false);
      if (dobErr) newErrors.dob = dobErr;
    }

    const feeErr = validateFee(form.consultationFee, true);
    if (feeErr) newErrors.consultationFee = feeErr;

    const expErr = validateExperience(form.experienceYears, true);
    if (expErr) newErrors.experienceYears = expErr;

    if (!sanitizeInput(form.qualification)) {
      newErrors.qualification = 'Professional qualification is required.';
    }

    if (!sanitizeInput(form.specialization) || form.specialization === 'Select Specialization') {
      newErrors.specialization = 'Please choose a primary specialization.';
    }

    if (!sanitizeInput(form.licenseNumber)) {
      newErrors.licenseNumber = 'Medical license or registration number is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAllFields()) {
      showToast('Please correct the highlighted form errors.', 'error');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = normalizePhoneNumber(form.phone);
      const feeRupees = Number(form.consultationFee);
      // Store in paise for backend financial accuracy
      const feePaise = feeRupees * 100;

      const payload = {
        name: `Dr. ${form.firstName.trim()} ${form.lastName.trim()}`.replace(/\s+/g, ' '),
        phoneNumber: cleanPhone,
        email: form.email.trim().toLowerCase(),
        dob: form.dob || undefined,
        gender: form.gender,
        role: 'therapist',
        profileImageUrl: form.photoUrl,
        avatarUrl: form.photoUrl,
        specializations: [form.specialization, 'Post-Operative Rehabilitation'],
        qualifications: form.qualification.split(',').map(q => q.trim()).filter(Boolean),
        experienceYears: Number(form.experienceYears),
        licenseNumber: form.licenseNumber.trim(),
        consultationFee: feePaise,
        languages: form.languages.split(',').map(l => l.trim()).filter(Boolean),
        bio: form.bio.trim(),
        clinicName: form.practiceClinic || 'OneMedical Care Center',
        clinicLocation: { address: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
        verificationStatus: 'verified',
        isVerified: true,
      };

      const res = await api.createTherapist(token, payload);
      if (res?.error) {
        throw new Error(res.error.message || 'Failed to create therapist.');
      }

      showToast(`Dr. ${form.firstName} ${form.lastName} enrolled successfully!`);
      setTimeout(() => navigate('/therapists'), 800);
    } catch (err) {
      console.error('Create therapist failed:', err);
      showToast(err.message || 'Failed to create therapist on the server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fullNameDisplay = (form.firstName || form.lastName)
    ? `Dr. ${form.firstName} ${form.lastName}`.trim()
    : 'Dr. New Specialist';

  return (
    <div className="space-y-6 animate-fade-up max-w-[1280px] pb-12">
      
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all border ${
          toast.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/therapists')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-700 transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Specialists Roster
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Add Specialist Clinician</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Enroll a licensed physiotherapist, assign clinical credentials, and configure appointment slots.
          </p>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        
        {/* LEFT COLUMN: FORM SECTIONS */}
        <div className="space-y-6">
          
          {/* 1. PERSONAL INFORMATION & PHOTO */}
          <div className="card p-6 space-y-5 shadow-xs rounded-2xl border border-slate-200/90 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User size={18} className="text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">Personal Information & Headshot</h3>
            </div>

            {/* AVATAR UPLOAD SECTION */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-200 border-2 border-blue-600/30 shadow-xs flex items-center justify-center">
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={28} className="text-slate-400" />
                    )}
                  </div>
                  {form.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, photoUrl: '' }))}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-primary text-xs font-bold py-2 px-3.5 bg-[#003882] hover:bg-[#002b66] text-white rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Upload size={14} /> Upload Device Photo
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Upload a high-resolution professional portrait (PNG, JPG, max 5MB).
                  </p>
                </div>
              </div>

              {/* QUICK PRESET HEADSHOTS */}
              <div className="pt-2 border-t border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Or select a curated preset portrait:
                </span>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, photoUrl: av.url }))}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        form.photoUrl === av.url ? 'border-blue-600 ring-2 ring-blue-600/30 scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* NAME & CONTACT INPUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>FIRST NAME *</span>
                  {errors.firstName && <span className="text-rose-600 font-semibold">{errors.firstName}</span>}
                </label>
                <input
                  className={`input text-xs py-2.5 rounded-xl ${errors.firstName ? 'border-rose-400 bg-rose-50/20' : ''}`}
                  placeholder="e.g. Vivek"
                  value={form.firstName}
                  onChange={updateForm('firstName')}
                  required
                />
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>LAST NAME *</span>
                  {errors.lastName && <span className="text-rose-600 font-semibold">{errors.lastName}</span>}
                </label>
                <input
                  className={`input text-xs py-2.5 rounded-xl ${errors.lastName ? 'border-rose-400 bg-rose-50/20' : ''}`}
                  placeholder="e.g. Joshi"
                  value={form.lastName}
                  onChange={updateForm('lastName')}
                  required
                />
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>EMAIL ADDRESS *</span>
                  {errors.email && <span className="text-rose-600 font-semibold">{errors.email}</span>}
                </label>
                <input
                  className={`input text-xs py-2.5 rounded-xl ${errors.email ? 'border-rose-400 bg-rose-50/20' : ''}`}
                  type="email"
                  placeholder="dr.vivek.joshi@onemedical.in"
                  value={form.email}
                  onChange={updateForm('email')}
                  required
                />
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>MOBILE NUMBER *</span>
                  {errors.phone && <span className="text-rose-600 font-semibold">{errors.phone}</span>}
                </label>
                <div className={`flex border rounded-xl overflow-hidden bg-slate-50 ${errors.phone ? 'border-rose-400' : 'border-slate-200'}`}>
                  <span className="px-3 py-2 text-xs font-bold text-slate-600 border-r border-slate-200 bg-slate-100 flex items-center">
                    +91
                  </span>
                  <input
                    className="input border-none rounded-none text-xs py-2 flex-1 bg-transparent"
                    placeholder="98765 43210"
                    value={form.phone}
                    onChange={updateForm('phone')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>DATE OF BIRTH</span>
                  {errors.dob && <span className="text-rose-600 font-semibold">{errors.dob}</span>}
                </label>
                <input
                  className={`input text-xs py-2 text-slate-700 rounded-xl ${errors.dob ? 'border-rose-400 bg-rose-50/20' : ''}`}
                  type="date"
                  value={form.dob}
                  onChange={updateForm('dob')}
                />
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase">GENDER</label>
                <div className="relative">
                  <select
                    className="select text-xs py-2 pr-8 appearance-none rounded-xl"
                    value={form.gender}
                    onChange={updateForm('gender')}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. PROFESSIONAL & CLINICAL INFORMATION */}
          <div className="card p-6 space-y-5 shadow-xs rounded-2xl border border-slate-200/90 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Stethoscope size={18} className="text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">Professional Credentials & Expertise</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>QUALIFICATIONS *</span>
                  {errors.qualification && <span className="text-rose-600 font-semibold">{errors.qualification}</span>}
                </label>
                <input
                  className={`input text-xs py-2.5 rounded-xl ${errors.qualification ? 'border-rose-400 bg-rose-50/20' : ''}`}
                  placeholder="e.g. MPT (Orthopedics), BPT, MIAP"
                  value={form.qualification}
                  onChange={updateForm('qualification')}
                  required
                />
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>SPECIALIZATION *</span>
                  {errors.specialization && <span className="text-rose-600 font-semibold">{errors.specialization}</span>}
                </label>
                <div className="relative">
                  <select
                    className="select text-xs py-2.5 pr-8 appearance-none rounded-xl"
                    value={form.specialization}
                    onChange={updateForm('specialization')}
                  >
                    <option value="Orthopedic Physiotherapy">Orthopedic Physiotherapy</option>
                    <option value="Sports Rehabilitation">Sports Rehabilitation</option>
                    <option value="Neurological Rehabilitation">Neurological Rehabilitation</option>
                    <option value="Pediatric Physiotherapy">Pediatric Physiotherapy</option>
                    <option value="Geriatric Mobility">Geriatric Mobility</option>
                    <option value="Post-Surgical Care">Post-Surgical Care</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>EXPERIENCE (YEARS) *</span>
                  {errors.experienceYears && <span className="text-rose-600 font-semibold">{errors.experienceYears}</span>}
                </label>
                <input
                  className={`input text-xs py-2.5 rounded-xl ${errors.experienceYears ? 'border-rose-400 bg-rose-50/20' : ''}`}
                  type="number"
                  placeholder="e.g. 11"
                  value={form.experienceYears}
                  onChange={updateForm('experienceYears')}
                  required
                />
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase">LANGUAGES SPOKEN</label>
                <input
                  className="input text-xs py-2.5 rounded-xl"
                  placeholder="e.g. English, Hindi, Kannada"
                  value={form.languages}
                  onChange={updateForm('languages')}
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>MEDICAL LICENSE NUMBER *</span>
                  {errors.licenseNumber && <span className="text-rose-600 font-semibold">{errors.licenseNumber}</span>}
                </label>
                <input
                  className={`input text-xs py-2.5 font-mono rounded-xl ${errors.licenseNumber ? 'border-rose-400 bg-rose-50/20' : ''}`}
                  placeholder="e.g. MP-REG-2024-9982"
                  value={form.licenseNumber}
                  onChange={updateForm('licenseNumber')}
                  required
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="label text-[10px] font-bold text-slate-500 uppercase">CLINICIAN BIO / ABOUT</label>
                <textarea
                  className="input text-xs py-2.5 rounded-xl min-h-[72px]"
                  placeholder="Brief clinical background and treatment philosophy for patient portal."
                  value={form.bio}
                  onChange={updateForm('bio')}
                />
              </div>
            </div>
          </div>

          {/* 3. CLINIC & APPOINTMENT PRICING */}
          <div className="card p-6 space-y-5 shadow-xs rounded-2xl border border-slate-200/90 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award size={18} className="text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">Clinic Location & Consultation Fee</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>CONSULTATION FEE (₹) *</span>
                  {errors.consultationFee && <span className="text-rose-600 font-semibold">{errors.consultationFee}</span>}
                </label>
                <div className={`flex border rounded-xl overflow-hidden bg-slate-50 ${errors.consultationFee ? 'border-rose-400' : 'border-slate-200'}`}>
                  <span className="px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200 bg-slate-100 flex items-center">
                    ₹
                  </span>
                  <input
                    className="input border-none rounded-none text-xs py-2 flex-1 bg-transparent"
                    type="number"
                    placeholder="800"
                    value={form.consultationFee}
                    onChange={updateForm('consultationFee')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase">PRACTICE CLINIC</label>
                <input
                  className="input text-xs py-2.5 rounded-xl"
                  placeholder="e.g. ONE MEDICAL Center, Indiranagar"
                  value={form.practiceClinic}
                  onChange={updateForm('practiceClinic')}
                />
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase">SESSION DURATION</label>
                <div className="relative">
                  <select
                    className="select text-xs py-2.5 pr-8 appearance-none rounded-xl"
                    value={form.sessionDuration}
                    onChange={updateForm('sessionDuration')}
                  >
                    <option value="30 Minutes">30 Minutes</option>
                    <option value="45 Minutes">45 Minutes</option>
                    <option value="60 Minutes">60 Minutes</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="label text-[10px] font-bold text-slate-500 uppercase">AVAILABILITY TYPE</label>
                <div className="relative">
                  <select
                    className="select text-xs py-2.5 pr-8 appearance-none rounded-xl"
                    value={form.availabilityType}
                    onChange={updateForm('availabilityType')}
                  >
                    <option value="Full-Time">Full-Time (Mon–Sat)</option>
                    <option value="Part-Time">Part-Time (Morning / Evening)</option>
                    <option value="Visiting Specialist">Visiting Consultant</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW & ONBOARDING TIPS */}
        <div className="space-y-6 sticky top-6">
          
          {/* 1. LIVE PROFILE PREVIEW CARD */}
          <div className="card overflow-hidden shadow-sm border border-slate-200/90 bg-white rounded-2xl">
            <div className="relative h-48 bg-slate-900">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover opacity-90" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900 text-white text-3xl font-black">
                  {form.firstName ? form.firstName.charAt(0) : 'D'}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-300">PROFILE PREVIEW</span>
                  <span className="bg-emerald-500/90 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded">VERIFIED</span>
                </div>
                <h3 className="text-base font-black drop-shadow-sm leading-snug">{fullNameDisplay}</h3>
                <p className="text-[11px] text-slate-300 font-medium truncate">{form.qualification || 'Physiotherapy Specialist'}</p>
              </div>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">SPECIALIZATION</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[170px]">
                  {form.specialization}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">EXPERIENCE</span>
                <span className="font-bold text-slate-800">
                  {form.experienceYears ? `${form.experienceYears} Years Exp.` : '—'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">CONSULTATION FEE</span>
                <span className="font-black text-emerald-600 text-sm">
                  ₹ {form.consultationFee || 0}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-medium">CLINIC</span>
                <span className="font-bold text-slate-700 text-right truncate max-w-[170px]">
                  {form.practiceClinic}
                </span>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-0.5 text-[11px] mt-2">
                <span className="font-bold text-blue-900 uppercase text-[9px] block">CLINICAL STATUS</span>
                <p className="text-slate-600">Auto-creates booking slots upon doctor enrollment.</p>
              </div>
            </div>
          </div>

          {/* 2. ONBOARDING TIPS CARD */}
          <div className="card p-5 space-y-3 bg-blue-50/40 border border-blue-100 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs border-b border-blue-100 pb-2">
              <HelpCircle size={15} className="text-blue-600" /> ENROLLMENT GUIDELINES
            </div>

            <ul className="space-y-2 text-[11px] text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                <span>Medical license number must match statutory council records.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                <span>Consultation fee will be reflected across client mobile app.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                <span>Specialists can immediately prescribe recovery programs to assigned patients.</span>
              </li>
            </ul>
          </div>

          {/* ACTION BUTTONS */}
          <div className="space-y-2.5 pt-2">
            <button
              type="submit"
              className="w-full btn btn-primary py-3 px-4 font-black text-xs bg-[#003882] hover:bg-[#002b66] text-white rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <span>Enrolling Specialist…</span>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Enroll & Publish Specialist
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/therapists')}
              className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 text-center cursor-pointer"
            >
              Cancel
            </button>
          </div>

        </div>

      </form>

    </div>
  );
}
