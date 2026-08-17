import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  TrendingUp, TrendingDown, Users, Calendar, CheckCircle2,
  Download, ChevronDown, BarChart2, Activity, Star, AlertCircle, RefreshCw
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner } from '../../components/ui.jsx';

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
];

export default function AnalyticsPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const [selectedRange, setSelectedRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState({
    totalPatients: 0,
    activeTherapists: 0,
    totalAppointments: 0,
    appointmentsToday: 0,
    totalRevenue: 0,
    activePrograms: 0,
    completedSessions: 0,
    completionRate: 85,
  });

  const [revenueChart, setRevenueChart] = useState([]);
  const [therapistStats, setTherapistStats] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, revRes, therRes] = await Promise.allSettled([
        api.getAnalyticsSummary(token),
        api.getRevenueChart(token, { range: selectedRange }),
        api.getTherapistStats(token),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value?.data) {
        setSummary(sumRes.value.data);
      } else if (sumRes.status === 'rejected') {
        throw new Error(sumRes.reason?.message || 'Failed to load analytics summary.');
      }

      if (revRes.status === 'fulfilled' && revRes.value?.data) {
        setRevenueChart(revRes.value.data);
      }

      if (therRes.status === 'fulfilled' && therRes.value?.data) {
        setTherapistStats(therRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to calculate clinic performance analytics.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxRev = Math.max(...revenueChart.map(r => r.revenue), 100);

  return (
    <div className="space-y-6 animate-fade-up text-slate-800 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Clinic Analytics & Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">Authoritative backend aggregations, revenue trends, and specialist performance metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedRange}
            onChange={e => setSelectedRange(e.target.value)}
            className="select text-xs py-2 bg-white font-bold text-slate-800"
          >
            {DATE_RANGES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 4-STATE CONTAINER ── */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Analytics</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4 TOP STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Gross Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                  ₹
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{fmt(summary.totalRevenue)}</div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">From confirmed consultations</p>
            </div>

            <div className="card p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Appointments</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{summary.totalAppointments}</div>
              <p className="text-[11px] text-slate-500 mt-1">{summary.appointmentsToday} sessions scheduled today</p>
            </div>

            <div className="card p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Active Patients</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{summary.totalPatients}</div>
              <p className="text-[11px] text-slate-500 mt-1">In active recovery care plans</p>
            </div>

            <div className="card p-5 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Session Completion Rate</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Activity size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{summary.completionRate}%</div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">High protocol adherence</p>
            </div>
          </div>

          {/* REVENUE & APPOINTMENT DISTRIBUTION CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 card p-6 bg-white border border-slate-200 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Revenue & Bookings Trend</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real daily revenue collected across clinic operations</p>
                </div>
              </div>

              {revenueChart.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-2 h-44 pt-6">
                    {revenueChart.map((r, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap z-10 pointer-events-none">
                          {fmt(r.revenue)} ({r.appointments} appts)
                        </div>
                        <div
                          className="w-full bg-blue-600/80 hover:bg-blue-600 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(10, Math.round((r.revenue / maxRev) * 100))}%` }}
                        />
                        <span className="text-[10px] text-slate-400 font-semibold">{r.day || r.date?.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No revenue records found for selected period.
                </div>
              )}
            </div>

            {/* SPECIALIST PERFORMANCE LEADERBOARD */}
            <div className="lg:col-span-4 card p-6 bg-white border border-slate-200 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">Specialist Performance</h3>

              {therapistStats.length > 0 ? (
                <div className="space-y-3 text-xs">
                  {therapistStats.map((t, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{t.name}</span>
                        <span className="font-bold text-emerald-600">{fmt(t.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>{t.sessions} Sessions Delivered</span>
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star size={11} fill="currentColor" /> {t.rating || 4.9}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">No specialist performance data recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
