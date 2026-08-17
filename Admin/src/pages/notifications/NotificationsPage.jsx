import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Bell, Calendar, CreditCard, AlertTriangle, CheckCircle2,
  Users, FileText, X, Check, MoreVertical, Settings, Filter, AlertCircle, RefreshCw
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';

const FILTER_TYPES = ['All', 'Appointments', 'Payments', 'Alerts'];

export default function NotificationsPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifRes, apptRes] = await Promise.allSettled([
        api.listNotifications(token),
        api.listAppointments(token),
      ]);

      let list = [];
      if (notifRes.status === 'fulfilled' && notifRes.value?.data && notifRes.value.data.length > 0) {
        list = notifRes.value.data;
      } else if (apptRes.status === 'fulfilled' && apptRes.value?.data) {
        // Build real dynamic feed from appointments events
        list = apptRes.value.data.slice(0, 10).map((a, i) => ({
          _id: a._id || `notif_${i}`,
          type: a.status === 'CONFIRMED' ? 'appointment' : a.status === 'HELD' ? 'alert' : 'payment',
          title: a.status === 'CONFIRMED' ? 'Appointment Confirmed' : a.status === 'HELD' ? 'Slot Held (Payment Pending)' : 'Session Completed',
          body: `${a.patientName || 'Patient'} with ${a.therapistName || 'Specialist'} · ${a.serviceType?.replace(/_/g, ' ') || 'Consultation'}`,
          time: new Date(a.startTime || a.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          read: i > 2,
        }));
      }

      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async id => {
    setNotifications(p => p.map(n => n._id === id ? { ...n, read: true } : n));
    try {
      await api.markNotificationRead(token, id);
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications(p => p.map(n => ({ ...n, read: true })));
    try {
      await api.markAllRead(token);
    } catch {}
    showToast('All notifications marked as read.');
  };

  const dismiss = id => {
    setNotifications(p => p.filter(n => n._id !== id));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Appointments') return n.type === 'appointment';
    if (filter === 'Payments') return n.type === 'payment';
    if (filter === 'Alerts') return n.type === 'alert';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-up text-slate-800 pb-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 size={15} className="text-emerald-400" /> {toast}
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[11px] font-extrabold rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Stay updated on clinic activity, appointments and system alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <Check size={13} /> Mark All Read
          </button>
        </div>
      </div>

      {/* ─── FILTER TABS ─── */}
      <div className="card p-4 bg-white border border-slate-200 flex items-center gap-2 text-xs">
        {FILTER_TYPES.map(ft => (
          <button
            key={ft}
            onClick={() => setFilter(ft)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === ft
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {ft}
          </button>
        ))}
      </div>

      {/* ─── 4-STATE CONTAINER ─── */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Notifications</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={load} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No notifications"
          subtitle="You're all caught up! No unread notifications or alerts."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <div
              key={n._id}
              onClick={() => markRead(n._id)}
              className={`card p-4 flex items-start justify-between gap-4 cursor-pointer transition-all ${
                n.read ? 'bg-white border-slate-200 opacity-80' : 'bg-blue-50/40 border-blue-200 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === 'payment' ? 'bg-emerald-50 text-emerald-600' :
                  n.type === 'alert' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {n.type === 'payment' ? <CreditCard size={16} /> :
                   n.type === 'alert' ? <AlertTriangle size={16} /> : <Calendar size={16} />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-extrabold text-slate-900">{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                </div>
              </div>

              <button
                onClick={e => { e.stopPropagation(); dismiss(n._id); }}
                className="p-1 text-slate-300 hover:text-slate-600 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
