import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Calendar, Clock, User, ChevronLeft, ChevronRight,
  Info, CheckCircle2, Briefcase, ChevronDown, ArrowLeft, RefreshCw, AlertCircle
} from 'lucide-react';
import { UserAvatar, Spinner } from '../../components/ui.jsx';
import { api } from '../../api/api.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TIME_ROWS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

function getWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export default function RescheduleAppointmentPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();
  const { id } = useParams();

  const [appointment, setAppointment] = useState(null);
  const [loadingAppt, setLoadingAppt] = useState(true);
  const [errorAppt, setErrorAppt] = useState(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('Patient Request');
  const [internalNotes, setInternalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
      console.error('Failed to load appointment:', err);
      setErrorAppt(err.message || 'Failed to load appointment details.');
    } finally {
      setLoadingAppt(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const ANCHOR_DATE = useMemo(() => new Date(), []);

  const weekDates = useMemo(() => {
    const monday = getWeekMonday(ANCHOR_DATE);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return DAYS.map((_, i) => addDays(monday, i));
  }, [weekOffset, ANCHOR_DATE]);

  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    if (start.getMonth() === end.getMonth()) {
      return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }, [weekDates]);

  const handleSelectSlot = (colIdx, time) => {
    const date = weekDates[colIdx];
    setSelectedSlot({
      colIdx,
      time,
      date,
      dateStr: `${DAY_NAMES[colIdx]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
      dateShort: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    });
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) {
      showToast('Please select a new time slot first.');
      return;
    }
    setSubmitting(true);
    try {
      const [timePart, meridiem] = selectedSlot.time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      const newStartTime = new Date(`${selectedSlot.dateShort}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);
      const durMin = appointment?.durationMin || 45;
      const newEndTime = new Date(newStartTime.getTime() + durMin * 60 * 1000);

      await api.rescheduleAppointment(token, id, {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        newStartTime: newStartTime.toISOString(),
        newEndTime: newEndTime.toISOString(),
        reason: rescheduleReason,
        notes: internalNotes,
      });

      showToast('Appointment rescheduled successfully!');
      setTimeout(() => navigate(`/appointments/${id}`), 1200);
    } catch (err) {
      alert(err.message || 'Failed to reschedule appointment on the server.');
    } finally {
      setSubmitting(false);
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
    <div className="space-y-6 text-slate-800 animate-fade-up max-w-[1400px] mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── PAGE HEADER ─── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <button onClick={() => navigate(`/appointments/${id}`)} className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft size={13} /> Appointment #{id?.slice(-6)?.toUpperCase()}
          </button>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reschedule Appointment</h1>
        <p className="text-xs text-slate-500 mt-1">Move an appointment slot while updating clinician calendar.</p>
      </div>

      {/* ─── CURRENT APPOINTMENT BANNER ─── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PATIENT</div>
              <div className="text-xs font-extrabold text-slate-900">
                {appointment?.patientName || 'Patient Name'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Briefcase size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SPECIALIST</div>
              <div className="text-xs font-extrabold text-slate-900">{appointment?.therapistName || 'Dr. Specialist'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CURRENT SCHEDULE</div>
              <div className="text-xs font-extrabold text-slate-900">
                {startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} • {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CALENDAR PICKER ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Select New Slot ({weekLabel})</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
                disabled={weekOffset <= 0}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Slots grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {weekDates.map((d, colIdx) => (
              <div key={colIdx} className="space-y-2">
                <div className="p-2 bg-slate-50 rounded-xl font-bold">
                  <div className="text-[10px] text-slate-400 uppercase">{DAYS[colIdx]}</div>
                  <div className="text-sm text-slate-900 mt-0.5">{d.getDate()}</div>
                </div>

                <div className="space-y-1.5">
                  {TIME_ROWS.map(time => {
                    const isSel = selectedSlot?.colIdx === colIdx && selectedSlot?.time === time;
                    return (
                      <button
                        key={time}
                        onClick={() => handleSelectSlot(colIdx, time)}
                        className={`w-full py-2 rounded-lg text-[11px] font-bold border transition-all ${
                          isSel
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50/50 hover:border-blue-300'
                        }`}
                      >
                        {time.replace(':00', '')}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SIDEBAR: CONFIRMATION FORM */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4 text-xs">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Reschedule Details</h3>

          <div>
            <label className="font-bold text-slate-700 mb-1 block">New Selected Time</label>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 font-bold text-blue-900">
              {selectedSlot ? `${selectedSlot.dateStr} at ${selectedSlot.time}` : 'Please choose a slot on the calendar'}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 mb-1 block">Reschedule Reason</label>
            <select
              value={rescheduleReason}
              onChange={e => setRescheduleReason(e.target.value)}
              className="select w-full"
            >
              <option value="Patient Request">Patient Request</option>
              <option value="Specialist Unavailability">Specialist Unavailability</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Clinic Reschedule">Clinic Operational Reschedule</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 mb-1 block">Internal Notes</label>
            <textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              placeholder="Add reason details..."
              className="input h-20 resize-none"
            />
          </div>

          <button
            onClick={handleConfirmReschedule}
            disabled={submitting || !selectedSlot}
            className="btn btn-primary w-full text-xs"
          >
            {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
