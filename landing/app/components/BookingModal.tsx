'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, CheckCircle2, Sparkles, Download, AlertCircle, Smartphone } from 'lucide-react';

interface TherapistOption {
  id: string;
  name: string;
  specialization: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoctorId?: string;
  initialDoctor?: string;
  initialPlan?: string;
  onDownloadApp?: () => void;
}

const DEFAULT_THERAPISTS: TherapistOption[] = [
  { id: 'doc_ananya_sharma', name: 'Dr. Ananya Sharma', specialization: 'Senior Musculoskeletal & Sports Specialist • 10 yrs exp' },
];

export default function BookingModal({
  isOpen,
  onClose,
  initialDoctorId,
  initialDoctor,
  initialPlan,
  onDownloadApp,
}: BookingModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [therapists, setTherapists] = useState<TherapistOption[]>(DEFAULT_THERAPISTS);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    serviceType: 'online',
    therapistId: initialDoctorId || DEFAULT_THERAPISTS[0].id,
    preferredDoctor: initialDoctor || DEFAULT_THERAPISTS[0].name,
    date: todayStr,
    timeSlot: '10:00 AM',
    notes: initialPlan ? `Selected Plan: ${initialPlan}` : '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial doctor / plan props when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setErrorMessage(null);
      setFormData((prev) => ({
        ...prev,
        therapistId: initialDoctorId || prev.therapistId || DEFAULT_THERAPISTS[0].id,
        preferredDoctor: initialDoctor || prev.preferredDoctor || DEFAULT_THERAPISTS[0].name,
        notes: initialPlan ? `Selected Plan: ${initialPlan}` : prev.notes,
        date: todayStr,
      }));
    }
  }, [isOpen, initialDoctorId, initialDoctor, initialPlan, todayStr]);

  // Fetch active verified therapists from backend API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchTherapists = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${backendUrl}/therapists`);
        if (!res.ok) return;
        const data = await res.json();

        if (isMounted && data.success && Array.isArray(data.data) && data.data.length > 0) {
          const list: TherapistOption[] = data.data.map((t: any) => ({
            id: t._id || t.userId,
            name: t.name || t.user?.name || 'Dr. Specialist',
            specialization: t.specializations?.length
              ? `${t.specializations.join(', ')} • ${t.experienceYears || 5} yrs exp`
              : `${t.experienceYears || 5} years experience`,
          }));
          setTherapists(list);

          // If current therapistId is not set or default, align with first fetched doctor
          setFormData((prev) => {
            if (initialDoctorId) {
              const matched = list.find((item) => item.id === initialDoctorId);
              if (matched) return { ...prev, therapistId: matched.id, preferredDoctor: matched.name };
            }
            if (initialDoctor) {
              const matched = list.find((item) => item.name.toLowerCase().includes(initialDoctor.toLowerCase()));
              if (matched) return { ...prev, therapistId: matched.id, preferredDoctor: matched.name };
            }
            return {
              ...prev,
              therapistId: prev.therapistId || list[0].id,
              preferredDoctor: prev.preferredDoctor || list[0].name,
            };
          });
        }
      } catch {
        // Fallback therapists already initialized
      }
    };

    fetchTherapists();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialDoctorId, initialDoctor]);

  const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api/v1';
      }
    }
    return 'https://onemedical-v2-gateway.onrender.com/api/v1';
  };

  const handlePhoneChange = (val: string) => {
    // Strip all non-digits
    let digits = val.replace(/\D/g, '');

    // Auto-strip leading +91 / 91 / 0 if user types or pastes with country code
    if (digits.length > 10 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length > 10 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    // Strictly limit to 10 digits
    digits = digits.slice(0, 10);

    // Format as 5-5 split: XXXXX XXXXX
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }

    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const handleTherapistSelect = (selectedId: string) => {
    const found = therapists.find((t) => t.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      therapistId: selectedId,
      preferredDoctor: found?.name || prev.preferredDoctor,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawDigits = formData.phone.replace(/\D/g, '');
    if (rawDigits.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      phone: `+91 ${rawDigits.slice(0, 5)} ${rawDigits.slice(5)}`,
      email: formData.email.trim(),
      serviceType: formData.serviceType,
      therapistId: formData.therapistId,
      preferredDoctor: formData.preferredDoctor,
      date: formData.date,
      timeSlot: formData.timeSlot,
      notes: formData.notes.trim(),
    };

    const primaryUrl = getApiBaseUrl();
    const fallbackUrl = primaryUrl.includes('localhost')
      ? 'https://onemedical-v2-gateway.onrender.com/api/v1'
      : 'http://localhost:5000/api/v1';

    let success = false;

    // Try Primary URL
    try {
      const res = await fetch(`${primaryUrl}/appointments/public-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success = true;
        setSubmitted(true);
      } else {
        setErrorMessage(
          data?.error?.message || 'Unable to submit your consultation request. Please check your details.'
        );
      }
    } catch {
      // If primary failed with network error, try fallback endpoint
      try {
        const res = await fetch(`${fallbackUrl}/appointments/public-booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          success = true;
          setSubmitted(true);
        } else {
          setErrorMessage(
            data?.error?.message || 'Unable to submit your consultation request. Please check your details.'
          );
        }
      } catch {
        setErrorMessage(
          'Unable to connect to the backend server. Please make sure the API Gateway server is running (Port 5000).'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setErrorMessage(null);
    onClose();
  };

  const triggerDownload = () => {
    if (onDownloadApp) {
      onDownloadApp();
    } else {
      window.open('https://expo.dev/accounts/uditeass-team', '_blank');
    }
    handleResetAndClose();
  };

  const rawPhoneDigits = formData.phone.replace(/\D/g, '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative border border-slate-100 my-8">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {submitted ? (
          /* ─── SUCCESS: LEAD RECEIVED SCREEN ─── */
          <div className="text-center py-4 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full mb-1.5 border border-emerald-200/60">
                Lead Received
              </span>
              <h3 className="text-xl font-extrabold text-[#051A3E]">
                Request Received! 🎉
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Thank you for choosing <span className="font-semibold text-slate-700">OneMedical</span>. Our clinical care team will contact you at <span className="font-bold text-slate-800">{formData.phone}</span> shortly to coordinate your session.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-left text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-bold text-slate-800">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Specialist:</span>
                <span className="font-bold text-slate-800">{formData.preferredDoctor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Preferred Slot:</span>
                <span className="font-semibold text-slate-700">{formData.date} at {formData.timeSlot}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={triggerDownload}
                className="w-full py-3 bg-[#003D9B] hover:bg-[#002b66] active:scale-98 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone size={16} />
                <span>Download OneMedical App</span>
              </button>

              <button
                onClick={handleResetAndClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* ─── BOOKING REQUEST FORM ─── */
          <div>
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#003D9B] text-[10.5px] font-bold mb-1 border border-blue-200/60">
                <Sparkles size={11} />
                <span>Quick Consultation Request</span>
              </div>
              <h3 className="text-xl font-bold text-[#051A3E]">
                Book An Assessment
              </h3>
              <p className="text-[11.5px] text-slate-500 font-normal">
                Submit your details to connect with our certified clinical therapists.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-[11.5px] animate-fadeIn">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 leading-snug">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Phone Number *
                    </label>
                    <span className={`text-[10px] font-medium ${rawPhoneDigits.length === 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                      {rawPhoneDigits.length === 10 ? '✓ 10 digits' : `${rawPhoneDigits.length}/10 digits`}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    {/* Fixed India Country Code Badge */}
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-200/80 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 select-none pointer-events-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={11}
                      placeholder="98765 43210"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-17 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Consultation Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'online', label: 'Online Video' },
                    { id: 'clinic', label: 'Clinic Visit' },
                    { id: 'home', label: 'Home Visit' },
                  ].map((mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setFormData({ ...formData, serviceType: mode.id })}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                        formData.serviceType === mode.id
                          ? 'bg-blue-50 border-[#003D9B] text-[#003D9B] shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Preferred Specialist
                </label>
                <select
                  value={formData.therapistId}
                  onChange={(e) => handleTherapistSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
                >
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Time Slot
                  </label>
                  <select
                    value={formData.timeSlot}
                    onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Condition / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lower back stiffness, sports recovery"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white rounded-full font-bold text-xs shadow-md shadow-blue-950/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <span>Submitting Request...</span>
                ) : (
                  <span>Send Consultation Request</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
