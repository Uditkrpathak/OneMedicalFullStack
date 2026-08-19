'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, CheckCircle2, Sparkles, Download, AlertCircle } from 'lucide-react';

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

  if (!isOpen) return null;

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
    setLoading(true);
    setErrorMessage(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${backendUrl}/appointments/public-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          serviceType: formData.serviceType,
          therapistId: formData.therapistId,
          preferredDoctor: formData.preferredDoctor,
          date: formData.date,
          timeSlot: formData.timeSlot,
          notes: formData.notes.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(
          data?.error?.message ||
          'Unable to submit your consultation request. Please check your details and try again.'
        );
      }
    } catch {
      setErrorMessage(
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051A3E]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close booking modal"
        >
          <X size={18} />
        </button>

        {submitted ? (
          /* Request Received State */
          <div className="text-center py-5 space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1 shadow-sm">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#051A3E]">
                Request Received! 🎉
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Thank you for choosing OneMedical.
              </p>
            </div>

            <div className="p-3.5 bg-blue-50/80 rounded-2xl text-[12px] text-slate-700 border border-blue-100 leading-relaxed text-left space-y-1.5 font-normal">
              <p>
                We have received your consultation enquiry for{' '}
                <strong className="text-[#003D9B] font-semibold">{formData.preferredDoctor}</strong>.
              </p>
              <p className="text-[11.5px] text-slate-600">
                Our clinical care team will contact you on{' '}
                <strong className="text-slate-900 font-semibold">{formData.phone}</strong> to confirm your slot.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-[11.5px] text-slate-600 border border-slate-200/80 text-left font-normal space-y-1">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#003D9B]" />
                Next Step: Complete in App
              </p>
              <p className="text-[11px] text-slate-500">
                Download the OneMedical mobile app to view therapist availability, manage medical records, and join video consultations directly.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={triggerDownload}
                className="w-full py-2.5 bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white rounded-full font-bold text-xs shadow-md shadow-blue-950/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                <span>Download OneMedical App</span>
              </button>

              <button
                onClick={handleResetAndClose}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form Entry State */
          <div>
            <div className="mb-4 space-y-1">
              <div className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#003D9B] bg-blue-50 px-2 py-0.5 rounded-full mb-0.5">
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
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
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
