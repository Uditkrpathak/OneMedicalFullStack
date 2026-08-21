import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, Calendar, Clock, MapPin, User, Stethoscope, Phone, Mail,
  FileText, CheckCircle, RefreshCcw, XCircle, Play, Send, Download,
  ExternalLink, Paperclip, AlertCircle, ShieldCheck, ChevronRight, Info,
  CheckCircle2, RefreshCw, Layers, Check
} from 'lucide-react';
import { api } from '../../api/api.js';
import { UserAvatar, Spinner } from '../../components/ui.jsx';

export default function AppointmentDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = useSelector(s => s.auth?.accessToken);

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAppointmentDetail(token, id);
      const apt = res?.data?.appointment || res?.data;

      if (apt && (apt._id || apt.id || apt.startTime)) {
        let patientDetail = null;
        let therapistDetail = null;

        try {
          const [pRes, tRes] = await Promise.allSettled([
            apt.patientId ? api.getPatientDetail(token, apt.patientId) : Promise.resolve(null),
            apt.therapistId ? api.getTherapist(token, apt.therapistId) : Promise.resolve(null),
          ]);
          if (pRes.status === 'fulfilled' && pRes.value?.data) {
            patientDetail = pRes.value.data.user || pRes.value.data;
          }
          if (tRes.status === 'fulfilled' && tRes.value?.data) {
            therapistDetail = tRes.value.data;
          }
        } catch (e) {
          console.warn('Could not fetch linked entities:', e);
        }

        const startDate = apt.startTime ? new Date(apt.startTime) : new Date();
        const pName = apt.patientName || patientDetail?.name || 'Rahul Sharma';
        const tName = apt.therapistName || therapistDetail?.name || therapistDetail?.user?.name || 'Dr. Specialist';
        const tSpec = therapistDetail?.specializations?.[0] || 'Physical Therapy Specialist';
        const pConcern = patientDetail?.profile?.primaryConcern || apt.serviceType?.replace(/_/g, ' ') || 'Rehabilitation';
        const pScore = patientDetail?.profile?.recoveryScore || 78;
        const pPhone = patientDetail?.phoneNumber || '—';

        const apptObj = {
          _id: apt._id || id,
          id: apt._id?.slice(-6)?.toUpperCase() || id?.slice(-6)?.toUpperCase(),
          status: apt.status || 'CONFIRMED',
          paymentStatus: apt.paymentStatus || 'PAID',
          cancellationReason: apt.cancellationReason,
          cancellationPolicy: apt.cancellationPolicy,
          amount: apt.amount || 120000,
          sessionType: apt.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Consultation',
          date: startDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
          time: startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          duration: `${apt.durationMin || 45} mins`,
          location: apt.appointmentPlace || 'Clinic Visit',
          patient: {
            id: apt.patientId,
            name: pName,
            condition: pConcern,
            recoveryScore: pScore,
            phone: pPhone,
          },
          therapist: {
            id: apt.therapistId,
            name: tName,
            specialization: tSpec,
            availability: 'Available',
          },
          notes: apt.notes || 'No pre-session clinical notes provided.',
          raw: apt,
        };
        setAppointment(apptObj);
      } else {
        throw new Error('Appointment details not found.');
      }
    } catch (err) {
      console.error('Failed to fetch appointment:', err);
      setError(err.message || 'Failed to load appointment details.');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApproveRefund = async () => {
    if (!window.confirm('Approve and process refund for this appointment?')) return;
    setActionLoading(true);
    try {
      await api.approveRefund(token, `ref_appt_${id}`);
      showToast('Refund approved and routed to gateway.');
      setAppointment(prev => prev ? ({ ...prev, paymentStatus: 'REFUNDED' }) : prev);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve refund.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      await api.completeAppointment(token, id, {});
      showToast('Appointment marked as COMPLETED.');
      setAppointment(prev => prev ? ({ ...prev, status: 'COMPLETED' }) : prev);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to complete appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    setActionLoading(true);
    try {
      await api.cancelAppointment(token, id, { reason: 'Cancelled by administrator' });
      showToast('Appointment cancelled.');
      setAppointment(prev => prev ? ({ ...prev, status: 'CANCELLED', cancellationPolicy: 'REFUND_ELIGIBLE', paymentStatus: 'REFUND_PENDING' }) : prev);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminder = async () => {
    setActionLoading(true);
    try {
      await api.sendReminder(token, id, { methods: { sms: true, email: true } });
      showToast('Reminder notification sent to patient!');
    } catch (err) {
      alert(err.message || 'Failed to send reminder.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Spinner />;

  if (error || !appointment) {
    return (
      <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-red-800">Failed to Load Appointment</h2>
        <p className="text-xs text-red-600">{error}</p>
        <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const isCompleted = appointment.status === 'COMPLETED';
  const isCancelled = appointment.status === 'CANCELLED';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <button onClick={() => navigate('/appointments')} className="hover:text-blue-600 flex items-center gap-1">
              <ArrowLeft size={13} /> Appointments
            </button>
            <span>/</span>
            <span className="text-slate-900 font-bold">#{appointment.id}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Appointment Details</h1>
            <span className={`px-3 py-0.5 text-xs font-bold rounded-full border ${
              isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              isCancelled ? 'bg-rose-50 text-rose-700 border-rose-200' :
              appointment.status === 'EXPIRED' ? 'bg-slate-100 text-slate-700 border-slate-200' :
              'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              ● {appointment.status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isCompleted && !isCancelled && (
            <>
              <button
                onClick={() => navigate(`/appointments/${id}/reschedule`)}
                className="btn btn-secondary text-xs"
              >
                <RefreshCcw size={13} /> Reschedule
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="btn btn-secondary text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                <XCircle size={13} /> Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={actionLoading}
                className="btn btn-secondary text-xs"
              >
                <Send size={13} /> Send Reminder
              </button>
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                <CheckCircle size={14} /> Mark Completed
              </button>
            </>
          )}
          {isCompleted && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold">
              <CheckCircle2 size={15} /> Consultation Completed
            </div>
          )}
          {isCancelled && (
            <div className="flex items-center gap-2 flex-wrap">
              {appointment.paymentStatus === 'REFUNDED' ? (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold">
                  <CheckCircle2 size={15} /> Refund Settled
                </div>
              ) : (
                <button
                  onClick={handleApproveRefund}
                  disabled={actionLoading}
                  className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle size={14} /> Approve & Settle Refund
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── CANCELLATION & REFUND BANNER ─── */}
      {isCancelled && (
        <div className={`card p-4.5 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
          appointment.paymentStatus === 'REFUNDED'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              appointment.paymentStatus === 'REFUNDED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <AlertCircle size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="font-extrabold text-sm">
                {appointment.paymentStatus === 'REFUNDED' ? 'Cancellation Processed & Refund Settled' : 'Session Cancelled • Refund Pending'}
              </div>
              <div className="text-slate-600 font-medium">
                Reason: <span className="font-bold text-slate-800">{appointment.cancellationReason || 'Cancelled by administrator'}</span>
                {' • '}Policy: <span className="font-bold">{appointment.cancellationPolicy || 'REFUND_ELIGIBLE'}</span>
              </div>
            </div>
          </div>

          {appointment.paymentStatus !== 'REFUNDED' && (
            <button
              onClick={handleApproveRefund}
              disabled={actionLoading}
              className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs whitespace-nowrap self-start sm:self-center"
            >
              Approve Refund Now
            </button>
          )}
        </div>
      )}

      {/* ─── MAIN GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CORE BOOKING INFO (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. SESSION SUMMARY CARD */}
          <div className="card p-6 bg-white border border-slate-200 space-y-5">
            <h2 className="text-base font-extrabold text-slate-900">Session Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Consultation Mode</div>
                <div className="text-sm font-bold text-slate-900">{appointment.location}</div>
                <div className="text-slate-500">{appointment.sessionType}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Schedule</div>
                <div className="text-sm font-bold text-slate-900">{appointment.date}</div>
                <div className="text-blue-600 font-bold">{appointment.time} ({appointment.duration})</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Pre-session Clinical Notes</div>
              <p className="text-slate-700 font-medium leading-relaxed">{appointment.notes}</p>
            </div>
          </div>

          {/* 2. PARTICIPANTS OVERVIEW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Patient Card */}
            <div className="card p-5 bg-white border border-slate-200 space-y-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Profile</div>
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm shadow-xs">
                  {appointment.patient.name[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{appointment.patient.name}</div>
                  <div className="text-[11px] text-slate-500">{appointment.patient.condition}</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <button
                  onClick={() => navigate(`/patients/${appointment.patient.id}`)}
                  className="text-blue-600 hover:text-blue-700 font-bold text-[11px] flex items-center gap-1"
                >
                  View Full Patient Record →
                </button>
              </div>
            </div>

            {/* Specialist Card */}
            <div className="card p-5 bg-white border border-slate-200 space-y-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Specialist</div>
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm shadow-xs">
                  {appointment.therapist.name.replace('Dr. ', '')[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{appointment.therapist.name}</div>
                  <div className="text-[11px] text-slate-500">{appointment.therapist.specialization}</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <button
                  onClick={() => navigate(`/therapists/${appointment.therapist.id}`)}
                  className="text-blue-600 hover:text-blue-700 font-bold text-[11px] flex items-center gap-1"
                >
                  View Specialist Profile →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLINICAL LOG WIDGET (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card p-6 bg-white border border-slate-200 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Session Summary Log</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Record diagnosis, range of motion observations, and next steps following this consultation.
            </p>

            <button
              onClick={() => navigate(`/appointments/${id}/summary`)}
              className="btn btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <FileText size={14} /> Record Clinical Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
