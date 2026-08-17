'use client';

import React, { useState } from 'react';
import { X, User, Phone, Mail, CheckCircle2, Sparkles } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoctor?: string;
  initialPlan?: string;
}

export default function BookingModal({
  isOpen,
  onClose,
  initialDoctor,
  initialPlan,
}: BookingModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    serviceType: 'online',
    preferredDoctor: initialDoctor || 'Dr. Arjun Mehta (Senior MSK)',
    date: '2026-08-18',
    timeSlot: '10:00 AM',
    notes: initialPlan ? `Selected Plan: ${initialPlan}` : '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051A3E]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Close booking modal"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-xl font-bold text-[#051A3E]">
              Consultation Scheduled!
            </h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed font-normal">
              Thank you, <strong className="text-[#051A3E]">{formData.name}</strong>.
              We have reserved your slot with{' '}
              <strong className="text-[#003D9B]">{formData.preferredDoctor}</strong> on{' '}
              <strong className="text-[#051A3E]">{formData.date} at {formData.timeSlot}</strong>.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 border border-slate-200/80 font-normal">
              A confirmation email & SMS with your consultation link has been sent to{' '}
              <strong className="text-[#051A3E]">{formData.email || formData.phone}</strong>.
            </div>

            <button
              onClick={handleResetAndClose}
              className="mt-3 w-full py-2.5 bg-[#003D9B] hover:bg-[#002e75] text-white rounded-full font-bold text-xs shadow-xs transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-5 space-y-1">
              <div className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#003D9B] bg-blue-50 px-2 py-0.5 rounded-full mb-0.5">
                <Sparkles size={11} />
                <span>Instant Consultation Booking</span>
              </div>
              <h3 className="text-xl font-bold text-[#051A3E]">
                Book Your Assessment
              </h3>
              <p className="text-[11.5px] text-slate-500 font-normal">
                Meet with our certified clinical therapists online or at our Indiranagar clinic.
              </p>
            </div>

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
                    placeholder="Enter your name"
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
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
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
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
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
                  value={formData.preferredDoctor}
                  onChange={(e) => setFormData({ ...formData, preferredDoctor: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003D9B]/20 focus:border-[#003D9B]"
                >
                  <option value="Dr. Arjun Mehta (Senior MSK)">Dr. Arjun Mehta (Senior Physiotherapist • 12 yrs exp)</option>
                  <option value="Dr. Ananya Iyer (Senior MSK)">Dr. Ananya Iyer (Senior MSK • 8 yrs exp)</option>
                  <option value="Dr. Priya Sharma (Neurological Specialist)">Dr. Priya Sharma (Neurological • 10 yrs exp)</option>
                  <option value="Dr. Rohan Verma (Sports Rehabilitation)">Dr. Rohan Verma (Sports Lead • 14 yrs exp)</option>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 bg-[#003D9B] hover:bg-[#002e75] active:scale-98 text-white rounded-full font-bold text-xs shadow-md shadow-blue-950/15 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span>Reserving Slot...</span>
                ) : (
                  <span>Confirm Consultation Booking</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
