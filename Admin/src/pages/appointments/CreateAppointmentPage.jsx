import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Search, Check, Clock, User, Calendar, ArrowRight, ArrowLeft,
  CheckCircle2, Star, ShieldCheck, MapPin, Video, Building, Plus,
  AlertCircle, FileText, ChevronLeft, ChevronRight, Filter,
  Building2, Home, VideoIcon, Paperclip, BellRing, CalendarCheck, Receipt,
  Info, MapPinIcon, Stethoscope, Layers, FileCheck, RefreshCw
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner } from '../../components/ui.jsx';

export const formatFee = (amount) => {
  if (!amount && amount !== 0) return '750';
  const num = Number(amount);
  if (isNaN(num)) return '750';
  const val = num >= 5000 ? Math.round(num / 100) : num;
  return val.toLocaleString('en-IN');
};

const generateDatesStrip = () => {
  const dates = [];
  const today = new Date();
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    dates.push({
      day: dayNames[d.getDay()],
      date: d.getDate(),
      fullDate: d.toISOString().slice(0, 10),
      displayDate: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      dateObj: d,
    });
  }
  return dates;
};

const DEFAULT_TIME_SLOTS = [
  { time: '09:00 AM', rawStart: '09:00', isAvailable: true },
  { time: '09:30 AM', rawStart: '09:30', isAvailable: true },
  { time: '10:00 AM', rawStart: '10:00', isAvailable: true },
  { time: '10:30 AM', rawStart: '10:30', isAvailable: true },
  { time: '11:00 AM', rawStart: '11:00', isAvailable: true },
  { time: '11:30 AM', rawStart: '11:30', isAvailable: true },
  { time: '12:00 PM', rawStart: '12:00', isAvailable: true },
  { time: '02:00 PM', rawStart: '14:00', isAvailable: true },
  { time: '02:30 PM', rawStart: '14:30', isAvailable: true },
  { time: '03:00 PM', rawStart: '15:00', isAvailable: true },
  { time: '03:30 PM', rawStart: '15:30', isAvailable: true },
  { time: '04:00 PM', rawStart: '16:00', isAvailable: true },
  { time: '04:30 PM', rawStart: '16:30', isAvailable: true },
  { time: '05:00 PM', rawStart: '17:00', isAvailable: true }
];

export const formatSlotTime = (slot) => {
  if (!slot) return '09:00 AM';
  const raw = typeof slot === 'string' ? slot : (slot.time || slot.startTime || '');
  if (!raw) return '09:00 AM';

  // If already formatted like "09:00 AM"
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(raw.trim())) {
    return raw.trim().toUpperCase();
  }

  // If "09:00" 24-hr format
  if (/^\d{1,2}:\d{2}$/.test(raw.trim())) {
    const [h, m] = raw.trim().split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // If ISO string like "2026-08-16T03:30:00.000Z"
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }).toUpperCase();
    }
  } catch (e) {}

  return String(raw);
};

export const parseSlotToDates = (dateStr, slot, durationMin = 30) => {
  const safeDateStr = dateStr || new Date().toISOString().slice(0, 10);
  
  // Case 1: Slot has direct ISO rawStart
  const rawStart = typeof slot === 'object' && slot !== null ? (slot.rawStart || slot.startTime) : slot;
  if (typeof rawStart === 'string' && rawStart.includes('T')) {
    const d = new Date(rawStart);
    if (!isNaN(d.getTime())) {
      const endD = new Date(d.getTime() + durationMin * 60 * 1000);
      return { startTime: d, endTime: endD };
    }
  }

  // Case 2: Formatted string like "09:30 AM" or "14:30"
  const timeStr = typeof slot === 'object' && slot !== null ? (slot.time || '') : String(slot || '');
  let hours = 9;
  let minutes = 0;

  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    hours = parseInt(match12[1], 10);
    minutes = parseInt(match12[2], 10);
    const meridiem = (match12[3] || '').toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }

  // Combine with dateStr in Asia/Kolkata (UTC +05:30)
  const [y, m, day] = safeDateStr.split('-').map(Number);
  // Construct UTC time corresponding to IST (hours - 5h30m)
  const utcDate = new Date(Date.UTC(y, m - 1, day, hours - 5, minutes - 30, 0, 0));
  const endUtcDate = new Date(utcDate.getTime() + durationMin * 60 * 1000);

  return { startTime: utcDate, endTime: endUtcDate };
};

export default function CreateAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId');
  const urlTherapistId = searchParams.get('therapistId');
  const token = useSelector(s => s.auth?.accessToken);

  // Wizard step state starts on Step 1
  const [currentStep, setCurrentStep] = useState(1);

  // Live Data lists
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Form selections
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [therapistSearch, setTherapistSearch] = useState('');

  // Step 3 Schedule selections
  const datesStrip = generateDatesStrip();
  const [sessionDuration, setSessionDuration] = useState('45m');
  const [selectedDateObj, setSelectedDateObj] = useState(datesStrip[0]);
  const [availableSlots, setAvailableSlots] = useState(DEFAULT_TIME_SLOTS);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(DEFAULT_TIME_SLOTS[0]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 4 Session Details selections
  const [sessionType, setSessionType] = useState('Clinic Visit');
  const [appointmentPlace, setAppointmentPlace] = useState('CLINIC');
  const [serviceType, setServiceType] = useState('PHYSIOTHERAPY_SESSION');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Load patients and therapists
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const [patRes, therRes] = await Promise.all([
          api.listPatients(token, { limit: 50 }),
          api.listTherapists(token, { limit: 50 }),
        ]);

        const patList = patRes?.data || [];
        const therList = therRes?.data || [];

        setPatients(patList.map(p => ({
          id: p._id,
          name: p.name || 'Patient',
          avatar: p.profileImageUrl || null,
          program: p.profile?.primaryConcern || 'Physiotherapy Care',
          phone: p.phoneNumber || '—',
          recoveryScore: p.profile?.recoveryScore || 75,
        })));

        setTherapists(therList.map(t => ({
          id: t._id || t.id,
          name: t.name || t.user?.name || 'Dr. Specialist',
          avatar: t.profileImageUrl || null,
          specs: t.specializations?.[0] || 'Orthopedics',
          rating: t.ratingAvg || 4.9,
          consultationFee: t.consultationFee || 75000,
        })));

        if (patList.length > 0) {
          const targetPatient = urlPatientId
            ? (patList.find(p => (p._id || p.id)?.toString() === urlPatientId.toString()) || patList[0])
            : patList[0];

          setSelectedPatient({
            id: targetPatient._id || targetPatient.id,
            name: targetPatient.name || 'Patient',
            avatar: targetPatient.profileImageUrl || null,
            program: targetPatient.profile?.primaryConcern || 'Physiotherapy Care',
            phone: targetPatient.phoneNumber || '—',
            recoveryScore: targetPatient.profile?.recoveryScore || 75,
          });
        }

        if (therList.length > 0) {
          const targetTherapist = urlTherapistId
            ? (therList.find(t => (t._id || t.id || t.userId)?.toString() === urlTherapistId.toString()) || therList[0])
            : therList[0];

          setSelectedTherapist({
            id: targetTherapist._id || targetTherapist.id,
            name: targetTherapist.name || targetTherapist.user?.name || 'Dr. Specialist',
            avatar: targetTherapist.profileImageUrl || null,
            specs: targetTherapist.specializations?.[0] || 'Orthopedics',
            rating: targetTherapist.ratingAvg || 4.9,
            consultationFee: targetTherapist.consultationFee || 75000,
          });
        }
      } catch (err) {
        console.error('Failed to load initial booking data:', err);
        setDataError(err.message || 'Failed to load directory for booking.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [token]);

  // Fetch slots whenever therapist or date changes
  useEffect(() => {
    if (!selectedTherapist?.id || !selectedDateObj?.fullDate) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await api.getTherapistSlots(token, selectedTherapist.id, selectedDateObj.fullDate);
        if (res?.data?.slots && res.data.slots.length > 0) {
          const formatted = res.data.slots.map(s => {
            const timeFormatted = formatSlotTime(s);
            const isAvail = s.status === 'AVAILABLE' || !s.status;
            return {
              time: timeFormatted,
              rawStart: s.startTime || s.time || s,
              rawEnd: s.endTime,
              status: s.status || 'AVAILABLE',
              isAvailable: isAvail,
            };
          });
          setAvailableSlots(formatted);
          const firstAvail = formatted.find(s => s.isAvailable) || formatted[0];
          setSelectedTimeSlot(firstAvail);
        } else {
          setAvailableSlots(DEFAULT_TIME_SLOTS);
          setSelectedTimeSlot(DEFAULT_TIME_SLOTS[0]);
        }
      } catch (err) {
        setAvailableSlots(DEFAULT_TIME_SLOTS);
        setSelectedTimeSlot(DEFAULT_TIME_SLOTS[0]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [token, selectedTherapist, selectedDateObj]);

  const handleNextStep = () => {
    if (currentStep < 5) setCurrentStep(c => c + 1);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  // Final Confirmation Submit
  const handleConfirmAndBook = async () => {
    if (!selectedPatient || !selectedTherapist || !selectedDateObj || !selectedTimeSlot) {
      setSubmitError('Please complete all selection steps before booking.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const durationMin = sessionDuration === '30m' ? 30 : sessionDuration === '60m' ? 60 : 45;
      const { startTime, endTime } = parseSlotToDates(selectedDateObj.fullDate, selectedTimeSlot, durationMin);

      const feePaise = selectedTherapist.consultationFee
        ? (selectedTherapist.consultationFee < 5000 ? selectedTherapist.consultationFee * 100 : selectedTherapist.consultationFee)
        : 75000;

      const payload = {
        patientId: selectedPatient.id,
        therapistId: selectedTherapist.id,
        patientName: selectedPatient.name,
        therapistName: selectedTherapist.name,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMin,
        amount: feePaise,
        serviceType: serviceType || 'PHYSIOTHERAPY_SESSION',
        appointmentPlace: appointmentPlace || 'CLINIC',
        notes: clinicalNotes || undefined,
      };

      const holdRes = await api.createAppointment(token, payload);
      const apptId = holdRes?.data?.appointment?._id || holdRes?.data?._id || holdRes?.data?.appointmentId || holdRes?.data?.id;

      if (apptId) {
        await api.confirmAppointment(token, apptId, {});
      }

      navigate('/appointments');
    } catch (err) {
      console.error('Booking appointment failed:', err);
      setSubmitError(err.message || 'Failed to book appointment on server.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.program.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const filteredTherapists = therapists.filter(t =>
    t.name.toLowerCase().includes(therapistSearch.toLowerCase()) ||
    t.specs.toLowerCase().includes(therapistSearch.toLowerCase())
  );

  const selectedSlotTimeString = typeof selectedTimeSlot === 'object' && selectedTimeSlot !== null
    ? (selectedTimeSlot.time || '09:00 AM')
    : formatSlotTime(selectedTimeSlot);

  if (loadingData) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-up max-w-[1280px] pb-12">
      {/* ── BREADCRUMB ── */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button onClick={() => navigate('/appointments')} className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Appointments
        </button>
        <span>/</span>
        <span className="text-slate-900 font-bold">New Booking</span>
      </div>

      {/* ── PAGE TITLE & STEPPER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Schedule New Appointment</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Book treatment consultations and sync specialist availability.</p>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(step => (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === step
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-100'
                  : currentStep > step
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > step ? <Check size={14} /> : step}
            </button>
          ))}
        </div>
      </div>

      {/* Global submit error */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── MAIN 2-COLUMN WIZARD LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ACTIVE STEP FORM */}
        <div className="lg:col-span-8 space-y-6">

          {/* STEP 1: SELECT PATIENT */}
          {currentStep === 1 && (
            <div className="card p-6 bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">Step 1: Select Patient</h2>
                <span className="text-xs text-slate-400 font-semibold">{patients.length} enrolled patients</span>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient by name or diagnosis..."
                  className="input pl-9 text-xs"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredPatients.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedPatient?.id === p.id
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-100'
                        : 'bg-white border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs">
                        {p.name[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.program} • {p.phone}</div>
                      </div>
                    </div>

                    {selectedPatient?.id === p.id && (
                      <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3">
                <button onClick={handleNextStep} disabled={!selectedPatient} className="btn btn-primary text-xs flex items-center gap-1.5">
                  <span>Select Specialist →</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT THERAPIST */}
          {currentStep === 2 && (
            <div className="card p-6 bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">Step 2: Select Specialist</h2>
                <span className="text-xs text-slate-400 font-semibold">{therapists.length} specialists available</span>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search specialist by name or specialization..."
                  className="input pl-9 text-xs"
                  value={therapistSearch}
                  onChange={e => setTherapistSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredTherapists.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTherapist(t)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedTherapist?.id === t.id
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-100'
                        : 'bg-white border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {t.avatar ? (
                        <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover shadow-xs" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs">
                          {t.name.replace('Dr. ', '')[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900">{t.name}</div>
                        <div className="text-[11px] text-slate-400">{t.specs} • Fee: ₹{formatFee(t.consultationFee)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="badge bg-amber-50 text-amber-700 text-[10px] font-bold">★ {t.rating}</span>
                      {selectedTherapist?.id === t.id && (
                        <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-3">
                <button onClick={handlePrevStep} className="btn btn-secondary text-xs">
                  ← Back
                </button>
                <button onClick={handleNextStep} disabled={!selectedTherapist} className="btn btn-primary text-xs">
                  Choose Date & Time →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SCHEDULE DATE & TIME */}
          {currentStep === 3 && (
            <div className="card p-6 bg-white border border-slate-200 space-y-6">
              <h2 className="text-base font-extrabold text-slate-900">Step 3: Select Date & Available Slot</h2>

              {/* Date strip */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">Choose Date</label>
                <div className="grid grid-cols-7 gap-2">
                  {datesStrip.map(d => (
                    <button
                      key={d.fullDate}
                      onClick={() => setSelectedDateObj(d)}
                      className={`p-3 rounded-xl text-center border transition-all ${
                        selectedDateObj.fullDate === d.fullDate
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase">{d.day}</div>
                      <div className="text-sm font-black mt-0.5">{d.date}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration toggle */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">Session Duration</label>
                <div className="flex gap-2">
                  {['30m', '45m', '60m'].map(dur => (
                    <button
                      key={dur}
                      onClick={() => setSessionDuration(dur)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        sessionDuration === dur
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {dur === '30m' ? '30 Minutes' : dur === '45m' ? '45 Minutes' : '60 Minutes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slots grid */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">Available Slots</label>
                {loadingSlots ? (
                  <Spinner />
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map(slot => {
                      const timeStr = typeof slot === 'string' ? formatSlotTime(slot) : slot.time;
                      const isSelected = selectedSlotTimeString === timeStr;
                      const isAvail = typeof slot === 'object' ? slot.isAvailable !== false : true;

                      return (
                        <button
                          key={timeStr}
                          disabled={!isAvail}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : !isAvail
                              ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <Clock size={12} className={isSelected ? 'text-white' : 'text-slate-400'} />
                          <span>{timeStr}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-3">
                <button onClick={handlePrevStep} className="btn btn-secondary text-xs">
                  ← Back
                </button>
                <button onClick={handleNextStep} disabled={!selectedTimeSlot} className="btn btn-primary text-xs">
                  Session Type & Details →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SESSION TYPE & LOCATION */}
          {currentStep === 4 && (
            <div className="card p-6 bg-white border border-slate-200 space-y-6">
              <h2 className="text-base font-extrabold text-slate-900">Step 4: Session Mode & Clinical Notes</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { mode: 'CLINIC', label: 'Clinic Visit', icon: Building2, desc: 'In-person clinic consultation' },
                  { mode: 'VIDEO', label: 'Video Call', icon: VideoIcon, desc: 'Telehealth virtual consult' },
                  { mode: 'HOME', label: 'Home Visit', icon: Home, desc: 'Physical therapist home session' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => {
                        setAppointmentPlace(item.mode);
                        setSessionType(item.label);
                      }}
                      className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                        appointmentPlace === item.mode
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-100'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={20} className={appointmentPlace === item.mode ? 'text-blue-600' : 'text-slate-400'} />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Service Classification</label>
                <select
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  className="select w-full text-xs"
                >
                  <option value="PHYSIOTHERAPY_SESSION">Physiotherapy Session</option>
                  <option value="INITIAL_ASSESSMENT">Initial Assessment</option>
                  <option value="FOLLOW_UP">Follow-Up Session</option>
                  <option value="VIDEO_CONSULTATION">Video Consultation</option>
                  <option value="HOME_VISIT">Home Visit</option>
                  <option value="POST_SURGERY">Post-Surgery Rehabilitation</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Pre-session Clinical Notes (Optional)</label>
                <textarea
                  value={clinicalNotes}
                  onChange={e => setClinicalNotes(e.target.value)}
                  placeholder="Notes for clinician regarding range of motion, previous surgery, or symptoms..."
                  className="input h-24 text-xs resize-none"
                />
              </div>

              <div className="flex justify-between pt-3">
                <button onClick={handlePrevStep} className="btn btn-secondary text-xs">
                  ← Back
                </button>
                <button onClick={handleNextStep} className="btn btn-primary text-xs">
                  Review & Confirm →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & CONFIRM */}
          {currentStep === 5 && (
            <div className="card p-6 bg-white border border-slate-200 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">Step 5: Review & Confirm Booking</h2>
                <span className="badge badge-blue text-xs font-bold">READY TO BOOK</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Patient Information</div>
                  <div className="font-bold text-slate-900 text-sm">{selectedPatient?.name}</div>
                  <div className="text-slate-500">{selectedPatient?.program} • {selectedPatient?.phone}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Specialist</div>
                  <div className="font-bold text-slate-900 text-sm">{selectedTherapist?.name}</div>
                  <div className="text-slate-500">{selectedTherapist?.specs}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Appointment Schedule</div>
                  <div className="font-bold text-slate-900 text-sm">{selectedDateObj?.displayDate}</div>
                  <div className="text-blue-600 font-bold">{selectedSlotTimeString} ({sessionDuration})</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Consultation Mode</div>
                  <div className="font-bold text-slate-900 text-sm">{sessionType}</div>
                  <div className="text-slate-500">{serviceType.replace(/_/g, ' ')}</div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button onClick={handlePrevStep} className="btn btn-secondary text-xs">
                  ← Back
                </button>
                <button
                  onClick={handleConfirmAndBook}
                  disabled={submitting}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> {submitting ? 'Booking Appointment...' : 'Confirm & Book Appointment'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: SUMMARY RECEIPT WIDGET */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-5 bg-white border border-slate-200 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Booking Summary</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Patient:</span>
                <span className="font-bold text-slate-900">{selectedPatient?.name || 'Not selected'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Specialist:</span>
                <span className="font-bold text-slate-900">{selectedTherapist?.name || 'Not selected'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Date:</span>
                <span className="font-bold text-slate-900">{selectedDateObj?.displayDate || selectedDateObj?.fullDate}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time Slot:</span>
                <span className="font-bold text-blue-600">{selectedSlotTimeString}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mode:</span>
                <span className="font-bold text-slate-900">{sessionType}</span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-900">
                <span>Consultation Fee:</span>
                <span className="text-sm">₹{formatFee(selectedTherapist?.consultationFee)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
