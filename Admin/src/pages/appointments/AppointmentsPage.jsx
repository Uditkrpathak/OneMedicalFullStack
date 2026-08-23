import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, User, Plus, Search, Filter,
  Check, Bell, Upload, Download, List, Grid,
  ChevronDown, Send, Clock, Printer, FileText,
  X, AlertCircle, CheckCircle2, ChevronRight, PlusCircle, RefreshCw,
  Phone, Mail, Globe, ExternalLink, Sparkles, MessageSquare
} from 'lucide-react';
import { api } from '../../api/api.js';
import { UserAvatar, Spinner, EmptyState } from '../../components/ui.jsx';

export default function AppointmentsPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();

  // Authoritative State from Backend Single Source of Truth
  const [dashboardData, setDashboardData] = useState({
    summary: { activeConfirmed: 0, completed: 0, holdsExpired: 0, cancelled: 0, allRecords: 0 },
    appointments: [],
    timeline: [],
    pendingConfirmations: [],
    meta: { page: 1, limit: 50, total: 0 }
  });

  const [therapistsList, setTherapistsList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [leadsSummary, setLeadsSummary] = useState({ total: 0, pendingCount: 0 });
  const [updatingLeadId, setUpdatingLeadId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE', 'COMPLETED', 'HOLDS_EXPIRED', 'CANCELLED', 'ALL', 'WEBSITE_LEADS'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // Dropdown toggles
  const [showTherapistDropdown, setShowTherapistDropdown] = useState(false);

  // Active Modals & Toast
  const [activeModal, setActiveModal] = useState(null); // 'reminder', 'reschedule', 'print'
  const [toastMessage, setToastMessage] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderMethods, setReminderMethods] = useState({ sms: true, email: true });
  const [reminderType, setReminderType] = useState('PAYMENT_DUE'); // 'PAYMENT_DUE' | 'SESSION'
  const [selectedApptForAction, setSelectedApptForAction] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getPaymentStatusBadge = (apt) => {
    const payStatus = (apt?.paymentStatus || 'PENDING').toUpperCase();
    const rawAmt = apt?.amount || 500;
    const amt = rawAmt > 5000 ? Math.round(rawAmt / 100) : rawAmt;

    if (payStatus === 'PAID') {
      return {
        label: `PAID (₹${amt})`,
        style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold',
        isPaid: true,
      };
    }
    if (payStatus === 'REFUNDED') {
      return {
        label: 'REFUNDED',
        style: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
        isRefunded: true,
      };
    }
    if (payStatus === 'REFUND_PENDING') {
      return {
        label: 'REFUND PENDING',
        style: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
        isRefundPending: true,
      };
    }
    const isVideo = (apt?.appointmentPlace || '').toUpperCase() === 'VIDEO';
    return {
      label: `PAYMENT DUE (₹${amt})`,
      sub: isVideo ? 'Online Video Required' : 'Due at Clinic / Online',
      style: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
      isPending: true,
    };
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, therRes, leadsRes] = await Promise.allSettled([
        api.getAppointmentsDashboard(token, {
          tab: activeTab,
          search: searchQuery,
          therapistId: selectedTherapist,
          type: selectedType,
          status: selectedStatus,
        }),
        api.listTherapists(token),
        api.listConsultationLeads(token, { search: searchQuery }),
      ]);

      if (dashRes.status === 'rejected' || !dashRes.value?.data) {
        throw new Error(dashRes.reason?.message || 'Failed to load appointments from server.');
      }

      setDashboardData(dashRes.value.data);

      if (therRes.status === 'fulfilled' && Array.isArray(therRes.value?.data)) {
        setTherapistsList(therRes.value.data);
      }

      if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value?.data)) {
        setLeadsList(leadsRes.value.data);
        if (leadsRes.value?.summary) {
          setLeadsSummary(leadsRes.value.summary);
        } else {
          setLeadsSummary({
            total: leadsRes.value.data.length,
            pendingCount: leadsRes.value.data.filter(l => l.status === 'PENDING').length,
          });
        }
      }
    } catch (err) {
      console.error('[AppointmentsPage] Error loading dashboard:', err);
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, searchQuery, selectedTherapist, selectedType, selectedStatus]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const { summary, appointments, timeline, pendingConfirmations } = dashboardData;

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') {
      return { label: '● COMPLETED', style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' };
    }
    if (s === 'DOCUMENTED') {
      return { label: '● DOCUMENTED', style: 'bg-indigo-50 text-indigo-700 border-indigo-200/80' };
    }
    if (s === 'DOCUMENTATION_PENDING') {
      return { label: '● DOCS PENDING', style: 'bg-amber-50 text-amber-800 border-amber-300' };
    }
    if (s === 'IN_PROGRESS') {
      return { label: '● IN PROGRESS', style: 'bg-cyan-50 text-cyan-700 border-cyan-300 font-extrabold' };
    }
    if (s === 'CHECKED_IN') {
      return { label: '● CHECKED IN', style: 'bg-teal-50 text-teal-700 border-teal-200/80 font-bold' };
    }
    if (s === 'CONFIRMED') {
      return { label: '● CONFIRMED', style: 'bg-blue-50 text-blue-700 border-blue-200/80' };
    }
    if (s === 'HELD' || s === 'PENDING') {
      return { label: '● HELD', style: 'bg-amber-50 text-amber-700 border-amber-200/60' };
    }
    if (s === 'RESCHEDULE_REQUESTED' || s === 'RESCHEDULED') {
      return { label: '● RESCHEDULED', style: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (s.includes('CANCELLED')) {
      return { label: '● CANCELLED', style: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (s === 'PROVIDER_NO_SHOW') {
      return { label: '● PROVIDER NO SHOW', style: 'bg-rose-50 text-rose-800 border-rose-300 font-bold' };
    }
    if (s === 'PATIENT_NO_SHOW' || s === 'NO_SHOW') {
      return { label: '● NO SHOW', style: 'bg-slate-100 text-slate-600 border-slate-300' };
    }
    if (s === 'EXPIRED' || s === 'PAYMENT_EXPIRED') {
      return { label: '● EXPIRED', style: 'bg-slate-100 text-slate-500 border-slate-300' };
    }
    return { label: `● ${s}`, style: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  const handleExportSchedule = () => {
    try {
      const headers = ['Appointment ID', 'Patient Name', 'Patient Details', 'Therapist', 'Type', 'Date', 'Time', 'Status'];
      const rows = appointments.map(a => {
        const d = new Date(a.startTime);
        return [
          a.id || a._id,
          `"${a.patientName}"`,
          `"${a.patientSubtitle || ''}"`,
          `"${a.therapistName}"`,
          `"${a.type}"`,
          `"${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}"`,
          `"${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}"`,
          `"${a.status}"`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `appointments-schedule-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Schedule exported as CSV successfully!');
    } catch {
      showToast('Failed to export schedule.');
    }
  };

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    setUpdatingLeadId(leadId);
    try {
      await api.updateLeadStatus(token, leadId, { status: newStatus });
      setLeadsList(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
      setLeadsSummary(prev => ({
        ...prev,
        pendingCount: newStatus === 'PENDING'
          ? prev.pendingCount + 1
          : Math.max(0, prev.pendingCount - (prev.pendingCount > 0 ? 1 : 0)),
      }));
      showToast(`Lead status updated to ${newStatus}`);
    } catch (err) {
      alert(err.message || 'Failed to update lead status.');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleConfirmAppointment = async (apptId) => {
    try {
      await api.updateAppointmentStatus(token, apptId, { status: 'CONFIRMED' });
      showToast('Appointment confirmed successfully!');
      loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to confirm appointment.');
    }
  };

  const handleRejectAppointment = async (apptId) => {
    if (!window.confirm('Are you sure you want to decline & delete this unconfirmed booking? The patient will be notified with instructions to re-book.')) return;
    try {
      await api.cancelAppointment(token, apptId, {
        reason: 'Appointment is not confirmed by clinic administration. If you want, please book a new appointment and complete payment.'
      });
      showToast('Appointment declined & slot released. Patient notified.');
      loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to decline appointment.');
    }
  };

  const handleSendReminder = async (specificApptId, specificType) => {
    const targetId = specificApptId || selectedApptForAction?._id || appointments[0]?._id;
    if (!targetId) return;
    const typeToSend = specificType || reminderType;
    setReminderLoading(true);
    try {
      await api.sendReminder(token, targetId, {
        reminderType: typeToSend,
        methods: reminderMethods
      });
      showToast(`${typeToSend === 'PAYMENT_DUE' ? 'Payment due reminder' : 'Session reminder'} sent via ${[reminderMethods.sms && 'SMS', reminderMethods.email && 'Email'].filter(Boolean).join(' & ')}!`);
    } catch (err) {
      alert(err.message || 'Failed to send reminder notification.');
    } finally {
      setReminderLoading(false);
      setActiveModal(null);
    }
  };

  const handlePrintLedger = () => {
    const rows = appointments.map(a => {
      const d = new Date(a.startTime);
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${a.id}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${a.patientName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${a.therapistName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${a.type}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${a.status}</td>
      </tr>`;
    }).join('');

    const html = `<html><head><title>OneMedical - Appointment Ledger</title>
      <style>body{font-family:sans-serif;padding:32px;color:#1e293b}h1{font-size:18px;font-weight:700;margin-bottom:4px}p{font-size:12px;color:#64748b;margin-bottom:24px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f8fafc;padding:8px 10px;text-align:left;font-weight:700;border-bottom:2px solid #e2e8f0;color:#64748b;text-transform:uppercase;letter-spacing:.05em}@media print{button{display:none}}</style></head><body>
      <h1>Appointment Ledger</h1>
      <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${appointments.length} appointments</p>
      <table><thead><tr><th>ID</th><th>Patient</th><th>Therapist</th><th>Type</th><th>Date & Time</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      <br><button onclick="window.print()">🖨 Print / Save PDF</button></body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    setActiveModal(null);
    showToast('Ledger generated! Open in print preview.');
  };

  return (
    <div className="space-y-6 text-slate-800 relative">
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-xs text-slate-500 mt-1 font-normal">Manage bookings, real clinician schedules and treatment sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportSchedule}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-[#003882] hover:text-[#002b66] text-xs font-bold rounded-full border border-blue-200/80 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload size={14} className="text-[#003882]" />
            <span>Export Schedule</span>
          </button>
          <button
            onClick={() => navigate('/appointments/create')}
            className="px-4 py-2 bg-[#003882] hover:bg-[#002b66] text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={15} />
            <span>Create Appointment</span>
          </button>
        </div>
      </div>

      {/* ─── 4 STAT CARDS (Authoritative Server Counts) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active & Confirmed</span>
            <span className="bg-blue-100/70 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">Live</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">{summary.activeConfirmed}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Active upcoming sessions</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Holds</span>
            <span className="bg-amber-100/70 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full">Action Needed</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">{summary.holdsExpired}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Payment or hold pending</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Sessions</span>
            <span className="bg-emerald-100/70 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">Delivered</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">{summary.completed}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Completed consultations</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelled Sessions</span>
            <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">Tracked</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">{summary.cancelled}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Cancelled bookings</div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      {loading && appointments.length === 0 ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Appointments</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={loadDashboard} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: TABLE & FILTER BAR (2xl: 8-9 COLS, full 100% width on laptops < 2xl) */}
          <div className="2xl:col-span-8 min-[1700px]:col-span-9 space-y-4 min-w-0">
            {/* STATUS FILTER TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'ACTIVE', label: 'Active & Confirmed', count: summary.activeConfirmed },
                { id: 'WEBSITE_LEADS', label: 'Website Leads', count: leadsSummary.pendingCount || leadsList.filter(l => l.status === 'PENDING').length, isLead: true },
                { id: 'COMPLETED', label: 'Completed', count: summary.completed },
                { id: 'HOLDS_EXPIRED', label: 'Holds & Expired', count: summary.holdsExpired },
                { id: 'CANCELLED', label: 'Cancelled', count: summary.cancelled },
                { id: 'ALL', label: 'All Records', count: summary.allRecords },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? tab.isLead
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-[#003882] text-white shadow-xs'
                        : tab.isLead && tab.count > 0
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.isLead && tab.count > 0
                          ? 'bg-amber-200/80 text-amber-900'
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* FILTER CONTROLS BAR */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'WEBSITE_LEADS' ? 'Search website leads...' : 'Filter appointments...'}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {activeTab !== 'WEBSITE_LEADS' && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Therapist Filter Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTherapistDropdown(!showTherapistDropdown)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <User size={13} className="text-slate-500" />
                      <span>{selectedTherapist === 'All' ? 'Therapist' : selectedTherapist}</span>
                      <ChevronDown size={12} className="text-slate-400" />
                    </button>
                    {showTherapistDropdown && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs">
                        <button
                          onClick={() => { setSelectedTherapist('All'); setShowTherapistDropdown(false); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium"
                        >
                          All Therapists
                        </button>
                        {therapistsList.map(t => (
                          <button
                            key={t._id}
                            onClick={() => { setSelectedTherapist(t.name || t.user?.name); setShowTherapistDropdown(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium truncate"
                          >
                            {t.name || t.user?.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* View Mode Toggle Icons */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                      title="List View"
                    >
                      <List size={14} />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                      title="Grid View"
                    >
                      <Grid size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TABLE / GRID DISPLAY */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              {activeTab === 'WEBSITE_LEADS' ? (
                /* ─── WEBSITE LEADS VIEW ─── */
                leadsList.length === 0 ? (
                  <EmptyState
                    title="No website leads yet"
                    subtitle="When prospective patients fill out the consultation form on the landing page, their requests will appear here instantly."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-200/80">
                          <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Patient Contact</th>
                          <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Requested Specialist</th>
                          <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Preferred Time</th>
                          <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Patient Note</th>
                          <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Status</th>
                          <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leadsList.map(lead => {
                          const createdAt = new Date(lead.createdAt || Date.now());
                          const dateStr = createdAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                          const timeStr = createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                          const mode = lead.appointmentPlace || 'VIDEO';

                          const statusColors = {
                            PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
                            CONTACTED: 'bg-blue-50 text-blue-700 border-blue-200',
                            CONVERTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
                          };

                          return (
                            <tr key={lead._id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                                    {lead.name?.[0]?.toUpperCase() || 'L'}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-900">{lead.name}</div>
                                    <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                                      <a
                                        href={`tel:${lead.phone}`}
                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        <Phone size={11} /> {lead.phone}
                                      </a>
                                      {lead.email && (
                                        <span className="text-slate-400 truncate max-w-[140px]" title={lead.email}>
                                          • {lead.email}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      Received: {dateStr} at {timeStr}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="text-xs font-bold text-slate-800">{lead.therapistName || 'Specialist Team'}</div>
                                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                  mode === 'VIDEO'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                                    : mode === 'HOME'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                    : 'bg-cyan-50 text-cyan-700 border-cyan-200/60'
                                }`}>
                                  {mode === 'VIDEO' ? 'Online Video' : mode === 'HOME' ? 'Home Visit' : 'Clinic Visit'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="text-xs font-bold text-slate-800">
                                  {lead.preferredDate ? new Date(lead.preferredDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {lead.preferredTime || 'Preferred slot'}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 max-w-[180px]">
                                <div className="text-xs text-slate-600 line-clamp-2" title={lead.notes}>
                                  {lead.notes || '—'}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <select
                                  value={lead.status || 'PENDING'}
                                  disabled={updatingLeadId === lead._id}
                                  onChange={e => handleUpdateLeadStatus(lead._id, e.target.value)}
                                  className={`text-[11px] font-bold rounded-lg px-2 py-1 border focus:outline-none cursor-pointer ${
                                    statusColors[lead.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  <option value="PENDING">● PENDING</option>
                                  <option value="CONTACTED">● CONTACTED</option>
                                  <option value="CONVERTED">● CONVERTED</option>
                                  <option value="CLOSED">● CLOSED</option>
                                </select>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => navigate('/appointments/create')}
                                  className="px-2.5 py-1 bg-[#003882] hover:bg-[#002b66] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all inline-flex items-center gap-1 cursor-pointer"
                                  title="Schedule full appointment for this lead"
                                >
                                  <span>Book</span>
                                  <ExternalLink size={11} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : appointments.length === 0 ? (
                <EmptyState
                  title="No appointments found"
                  subtitle={searchQuery ? 'No appointments match the search filters.' : 'There are currently no appointments in this category.'}
                  actionLabel="Schedule Appointment"
                  onAction={() => navigate('/appointments/create')}
                />
              ) : viewMode === 'list' ? (
                <div className="overflow-x-auto w-full scrollbar-thin">
                  <table className="w-full text-left border-collapse min-w-[940px]">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200/80">
                        <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase w-[22%]">Patient</th>
                        <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase w-[18%]">Therapist</th>
                        <th className="py-3.5 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase w-[11%]">Type</th>
                        <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase w-[15%]">Date & Time</th>
                        <th className="py-3.5 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase w-[12%]">Status</th>
                        <th className="py-3.5 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase w-[12%]">Payment</th>
                        <th className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase text-right w-[10%] whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appointments.map(apt => {
                        const d = new Date(apt.startTime);
                        const dateFormatted = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
                        const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                        const badge = getStatusBadge(apt.status);
                        const payBadge = getPaymentStatusBadge(apt);
                        const typeStyle = apt.appointmentPlace === 'VIDEO' ? 'bg-purple-50 text-purple-700 border-purple-200/60' : apt.appointmentPlace === 'HOME' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-cyan-50 text-cyan-700 border-cyan-200/60';

                        return (
                          <tr
                            key={apt._id}
                            onClick={() => navigate(`/appointments/${apt._id}`)}
                            className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  src={apt.patientAvatar || apt.patientAvatarUrl}
                                  name={apt.patientName}
                                  className="w-9 h-9 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 leading-snug truncate">{apt.patientName}</div>
                                  <div className="text-[11px] text-slate-400 font-normal truncate">{apt.patientSubtitle || 'In-Clinic Consultation'}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <UserAvatar
                                  src={apt.therapistAvatar || apt.therapistAvatarUrl}
                                  name={apt.therapistName}
                                  className="w-8 h-8 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 leading-snug truncate">{apt.therapistName}</div>
                                  <div className="text-[11px] text-slate-400 font-normal truncate">{apt.therapistSubtitle}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full border whitespace-nowrap ${typeStyle}`}>
                                {apt.type}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="text-xs font-bold text-slate-800 leading-snug">{dateFormatted}</div>
                              <div className="text-[11px] text-slate-400 font-normal">{timeFormatted}</div>
                            </td>

                            {/* APPOINTMENT LIFECYCLE STATUS */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${badge.style}`}>
                                {badge.label}
                              </span>
                            </td>

                            {/* PAYMENT STATUS BADGE */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className={`inline-block px-2.5 py-0.5 text-[10px] rounded-full border whitespace-nowrap ${payBadge.style}`}>
                                  ● {payBadge.label}
                                </span>
                                {payBadge.sub && (
                                  <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                    {payBadge.sub}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* ROW ACTIONS */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              {payBadge.isPending ? (
                                <button
                                  onClick={() => {
                                    setSelectedApptForAction(apt);
                                    setReminderType('PAYMENT_DUE');
                                    setActiveModal('reminder');
                                  }}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                  title="Send payment due reminder to patient"
                                >
                                  <Bell size={12} className="text-amber-700 shrink-0" />
                                  <span>Remind Payment</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedApptForAction(apt);
                                    setReminderType('SESSION');
                                    setActiveModal('reminder');
                                  }}
                                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                  title="Send session reminder to patient"
                                >
                                  <Send size={12} className="text-slate-500 shrink-0" />
                                  <span>Remind</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {appointments.map(apt => {
                    const d = new Date(apt.startTime);
                    const badge = getStatusBadge(apt.status);
                    const payBadge = getPaymentStatusBadge(apt);
                    const typeStyle = apt.appointmentPlace === 'VIDEO' ? 'bg-purple-50 text-purple-700 border-purple-200/60' : apt.appointmentPlace === 'HOME' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-cyan-50 text-cyan-700 border-cyan-200/60';

                    return (
                      <div
                        key={apt._id}
                        onClick={() => navigate(`/appointments/${apt._id}`)}
                        className="p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all cursor-pointer space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              src={apt.patientAvatar || apt.patientAvatarUrl}
                              name={apt.patientName}
                              className="w-10 h-10"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900">{apt.patientName}</div>
                              <div className="text-[11px] text-slate-400">{apt.patientSubtitle || 'In-Clinic Consultation'}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${badge.style}`}>
                              {badge.label}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${payBadge.style}`}>
                              ● {payBadge.label}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">{apt.therapistName}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${typeStyle}`}>
                            {apt.type}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} /> {d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApptForAction(apt);
                              setReminderType(payBadge.isPending ? 'PAYMENT_DUE' : 'SESSION');
                              setActiveModal('reminder');
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Bell size={11} /> Remind
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: SIDEBAR WIDGETS (2xl: 4-3 COLS, responsive grid on < 2xl) */}
          <div className="2xl:col-span-4 min-[1700px]:col-span-3 w-full grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-1 gap-5">
            {/* WIDGET 1: TODAY'S TIMELINE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Timeline</h3>
                <span className="text-xs font-bold text-blue-600">{timeline.length} Scheduled</span>
              </div>

              <div className="space-y-3">
                {timeline.length > 0 ? (
                  timeline.map(t => {
                    const badge = getStatusBadge(t.status);
                    return (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full border-2 border-blue-600 bg-white" />
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">{t.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5">{t.detail}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.style}`}>
                          {t.status}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">No timeline sessions for today.</p>
                )}
              </div>
            </div>

            {/* WIDGET 2: PENDING CONFIRMATIONS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Pending Confirmations</h3>

              <div className="space-y-3">
                {pendingConfirmations.length > 0 ? (
                  pendingConfirmations.map(p => {
                    const d = new Date(p.startTime);
                    return (
                      <div key={p._id} className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            src={p.patientAvatar || p.patientAvatarUrl}
                            name={p.patientName}
                            className="w-8 h-8 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{p.patientName}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} • {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleConfirmAppointment(p._id)}
                            className="btn btn-secondary btn-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 border border-emerald-200 cursor-pointer flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs"
                            title="Confirm appointment"
                          >
                            <Check size={12} strokeWidth={2.5} /> Confirm
                          </button>
                          <button
                            onClick={() => handleRejectAppointment(p._id)}
                            className="btn btn-secondary btn-xs text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 border border-rose-200 cursor-pointer flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs"
                            title="Decline & delete unconfirmed appointment"
                          >
                            <X size={12} strokeWidth={2.5} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">All bookings are confirmed.</p>
                )}
              </div>
            </div>

            {/* WIDGET 3: QUICK ACTIONS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setSelectedApptForAction(appointments[0] || null);
                    setReminderType(appointments[0]?.paymentStatus === 'PENDING' ? 'PAYMENT_DUE' : 'SESSION');
                    setActiveModal('reminder');
                  }}
                  className="p-3.5 bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 rounded-2xl flex flex-col items-center justify-center text-center group transition-all shadow-2xs cursor-pointer"
                >
                  <Send size={18} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Send Reminder</span>
                </button>

                <button
                  onClick={handlePrintLedger}
                  className="p-3.5 bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 rounded-2xl flex flex-col items-center justify-center text-center group transition-all shadow-2xs cursor-pointer"
                >
                  <Printer size={18} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">Print Ledger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SEND REMINDER MODAL ── */}
      {activeModal === 'reminder' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                {reminderType === 'PAYMENT_DUE' ? 'Send Payment Due Reminder' : 'Send Session Reminder'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {selectedApptForAction ? (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Patient:</span>
                  <span className="font-bold text-slate-900">{selectedApptForAction.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Doctor:</span>
                  <span className="font-bold text-slate-800">{selectedApptForAction.therapistName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Payment Status:</span>
                  <span className={`font-bold ${selectedApptForAction.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {selectedApptForAction.paymentStatus === 'PAID' ? 'PAID' : `PAYMENT DUE (₹${selectedApptForAction.amount || 500})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Mode:</span>
                  <span className="font-bold text-slate-800">
                    {selectedApptForAction.appointmentPlace === 'VIDEO' ? 'Online Video Consultation' : (selectedApptForAction.appointmentPlace === 'HOME' ? 'Home Visit' : 'Clinic Visit')}
                  </span>
                </div>
              </div>
            ) : null}

            {/* REMINDER TYPE SELECTOR */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Reminder Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReminderType('PAYMENT_DUE')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    reminderType === 'PAYMENT_DUE'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-amber-700 mb-0.5">
                    <Bell size={13} />
                    <span>Payment Due</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500 block">Send payment notice & link</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReminderType('SESSION')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    reminderType === 'SESSION'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-blue-700 mb-0.5">
                    <Clock size={13} />
                    <span>Session Reminder</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500 block">Schedule & join instructions</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">Choose delivery channels to dispatch notification:</p>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderMethods.sms}
                  onChange={e => setReminderMethods(p => ({ ...p, sms: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="font-bold text-slate-800">SMS Notification (+91)</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderMethods.email}
                  onChange={e => setReminderMethods(p => ({ ...p, email: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="font-bold text-slate-800">Email Notification</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setActiveModal(null)} className="btn btn-secondary text-xs cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleSendReminder()}
                disabled={reminderLoading || (!reminderMethods.sms && !reminderMethods.email)}
                className={`btn text-xs flex items-center gap-1.5 cursor-pointer ${
                  reminderType === 'PAYMENT_DUE' ? 'btn-primary bg-amber-600 hover:bg-amber-700 border-amber-700 text-white' : 'btn-primary'
                }`}
              >
                <Send size={13} /> {reminderLoading ? 'Sending...' : (reminderType === 'PAYMENT_DUE' ? 'Send Payment Reminder' : 'Send Session Reminder')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
