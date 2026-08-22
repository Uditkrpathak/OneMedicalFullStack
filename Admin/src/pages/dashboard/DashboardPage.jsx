import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Users, Stethoscope, Calendar, CreditCard, TrendingUp, Activity, ArrowRight, Clock,
  CheckCircle, AlertCircle, RefreshCw, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../api/api.js';
import { StatCard, PageHeader, Spinner, StatusBadge, EmptyState } from '../../components/ui.jsx';

function fmt(n) {
  const val = Number(n || 0);
  const normalized = val >= 10000 ? Math.round(val / 100) : val;
  return `₹${normalized.toLocaleString('en-IN')}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-md text-xs">
      <p className="text-slate-400 mb-1 font-semibold">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-bold text-xs">
          {p.name}: {p.name === 'Revenue' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const currentUser = useSelector(s => s.auth?.user);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [pendingLeadsCount, setPendingLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, revRes, patRes, apptRes, leadsRes] = await Promise.allSettled([
        api.getAnalyticsSummary(token),
        api.getRevenueChart(token, { range: '7d' }),
        api.listPatients(token, { limit: 5 }),
        api.listAppointments(token, { limit: 5 }),
        api.listConsultationLeads(token, { limit: 5 }),
      ]);

      if (leadsRes.status === 'fulfilled' && leadsRes.value?.summary) {
        setPendingLeadsCount(leadsRes.value.summary.pendingCount || 0);
      } else if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value?.data)) {
        setPendingLeadsCount(leadsRes.value.data.filter(l => l.status === 'PENDING').length);
      }

      if (sumRes.status === 'fulfilled' && sumRes.value?.data) {
        setStats(sumRes.value.data);
      } else if (sumRes.status === 'rejected') {
        throw new Error(sumRes.reason?.message || 'Failed to load dashboard metrics.');
      }

      if (revRes.status === 'fulfilled' && revRes.value?.data) {
        setRevenueChart(revRes.value.data);
      }

      if (patRes.status === 'fulfilled' && patRes.value?.data) {
        setRecentPatients(patRes.value.data.map(p => ({
          id: p._id,
          name: p.name || 'Patient',
          condition: p.profile?.primaryConcern || 'Physiotherapy Care',
          progress: p.profile?.recoveryScore || 70,
          status: p.isActive !== false ? 'active' : 'inactive',
          avatar: p.profileImageUrl || null,
        })));
      }

      if (apptRes.status === 'fulfilled' && apptRes.value?.data) {
        setRecentAppointments(apptRes.value.data.map(a => {
          const sDate = a.startTime ? new Date(a.startTime) : new Date();
          return {
            id: a._id,
            patient: a.patientName || 'Patient',
            type: a.serviceType?.replace(/_/g, ' ') || 'Consultation',
            time: `${sDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · ${sDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
            status: (a.status || 'CONFIRMED').toLowerCase(),
          };
        }));
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to connect to clinic services.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Spinner />;

  if (error || !stats) {
    return (
      <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
        <AlertCircle size={36} className="text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-red-800">Failed to Load Dashboard</h2>
        <p className="text-xs text-red-600">{error}</p>
        <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Good day, {currentUser?.name || 'Administrator'} 👋</h1>
          <p className="text-xs text-slate-500 mt-0.5">{today} · Real-time Clinical Operations Center</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/appointments/create')} className="btn btn-primary text-xs">
            + New Appointment
          </button>
          <button onClick={() => navigate('/patients/add')} className="btn btn-secondary text-xs">
            + Enroll Patient
          </button>
        </div>
      </div>

      {/* NEW WEBSITE LEADS ALERT BANNER */}
      {pendingLeadsCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                <span>{pendingLeadsCount} New Website Consultation {pendingLeadsCount === 1 ? 'Enquiry' : 'Enquiries'}</span>
                <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">Action Needed</span>
              </div>
              <p className="text-[11.5px] text-amber-800/80 mt-0.5">
                Prospective patients submitted consultation requests from the landing page.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/appointments')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Review Leads in Appointments</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* 4 TOP STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Patients"
          value={stats.totalPatients}
          change={`${stats.totalPatients} enrolled`}
          trend="up"
          color="blue"
        />
        <StatCard
          icon={Stethoscope}
          label="Active Specialists"
          value={stats.activeTherapists}
          change="Available on schedule"
          trend="up"
          color="emerald"
        />
        <StatCard
          icon={Calendar}
          label="Total Consultations"
          value={stats.totalAppointments}
          change={`${stats.appointmentsToday} scheduled today`}
          trend="up"
          color="indigo"
        />
        <StatCard
          icon={CreditCard}
          label="Settled Revenue"
          value={fmt(stats.totalRevenue)}
          change="From confirmed sessions"
          trend="up"
          color="purple"
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2 space-y-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Consultation Volume Trend</h2>
              <p className="text-xs text-slate-400">Daily appointment bookings</p>
            </div>
            <button onClick={() => navigate('/analytics')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View Analytics <ArrowRight size={12} />
            </button>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="apptGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#003882" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#003882" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="appointments" name="Appointments" stroke="#003882" strokeWidth={2.5} fill="url(#apptGrad)" dot={{ r: 3, fill: '#003882' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 space-y-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Revenue (₹)</h2>
              <p className="text-xs text-slate-400">Settled consult revenue</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* RECENT PATIENTS */}
        <div className="card p-5 space-y-3 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Enrolled Patients</h2>
            <button onClick={() => navigate('/patients')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              All Patients <ArrowRight size={12} />
            </button>
          </div>
          {recentPatients.length > 0 ? (
            <div className="space-y-2">
              {recentPatients.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {p.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.condition}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-blue-600">{p.progress}%</span>
                    <p className="text-[9px] text-slate-400">Recovery</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">No enrolled patients.</p>
          )}
        </div>

        {/* RECENT APPOINTMENTS */}
        <div className="card p-5 space-y-3 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Scheduled Consultations</h2>
            <button onClick={() => navigate('/appointments')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              All Bookings <ArrowRight size={12} />
            </button>
          </div>
          {recentAppointments.length > 0 ? (
            <div className="space-y-2">
              {recentAppointments.map(a => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-slate-900">{a.patient}</p>
                    <p className="text-[10px] text-slate-400">{a.type}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-semibold text-slate-600 block">{a.time}</span>
                    <span className="badge badge-green text-[9px] uppercase font-bold">● {a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">No scheduled consultations.</p>
          )}
        </div>
      </div>
    </div>
  );
}
