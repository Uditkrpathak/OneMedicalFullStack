import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus, Search, Shield, User, Edit2, Trash2, CheckCircle2,
  MoreVertical, X, ChevronDown, Clock, Activity, AlertCircle, RefreshCw
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';

const ROLES = ['All', 'admin', 'clinic_admin', 'therapist', 'patient'];

const ROLE_COLORS = {
  admin:        'bg-purple-50 text-purple-700 border-purple-200',
  clinic_admin: 'bg-blue-50 text-blue-700 border-blue-200',
  therapist:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  patient:      'bg-slate-50 text-slate-700 border-slate-200',
};

const TABS = ['Staff & Users', 'Audit Trail'];

export default function UsersPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const [staff, setStaff] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('Staff & Users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('clinic_admin');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, auditRes] = await Promise.allSettled([
        api.listUsers(token, { limit: 100 }),
        api.getAuditLog(token, { limit: 50 }),
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value?.data) {
        setStaff(usersRes.value.data);
      } else if (usersRes.status === 'rejected') {
        throw new Error(usersRes.reason?.message || 'Failed to load user directory.');
      }

      if (auditRes.status === 'fulfilled' && auditRes.value?.data) {
        setAuditLogs(auditRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load users/audit logs:', err);
      setError(err.message || 'Failed to load user records.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddStaff = async e => {
    e.preventDefault();
    if (!newName || !newPhone) {
      alert('Name and phone number are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createStaffUser(token, {
        name: newName,
        email: newEmail || undefined,
        phoneNumber: newPhone,
        role: newRole,
      });
      showToast(`${newName} enrolled as ${newRole}!`);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user account "${name}"?`)) return;
    try {
      await api.deleteStaffUser(token, id);
      showToast('User removed.');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const filteredStaff = staff.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (s.name || '').toLowerCase().includes(q) || (s.phoneNumber || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
    const matchRole = roleFilter === 'All' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 animate-fade-up text-slate-800 pb-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 size={15} className="text-emerald-400" /> {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Staff & Access Control</h1>
          <p className="text-xs text-slate-500 mt-1">Manage administrative staff, permissions, and security audit logs.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary text-xs flex items-center gap-1.5"
        >
          <Plus size={15} /> Add Staff User
        </button>
      </div>

      {/* ── TABS ── */}
      <div className="border-b border-slate-200 flex gap-2 text-xs">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── 4-STATE CONTAINER ── */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load User Directory</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : activeTab === 'Staff & Users' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4 bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, phone or email..."
                className="input pl-9 text-xs py-2 w-full"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="select text-xs py-2 sm:w-48"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r === 'All' ? 'All User Roles' : r.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {filteredStaff.length === 0 ? (
            <EmptyState
              title="No users found"
              subtitle="No user accounts match your search filter."
              actionLabel="Add Staff Member"
              onAction={() => setShowAddModal(true)}
            />
          ) : (
            <div className="card overflow-hidden bg-white border border-slate-200">
              <table className="tbl w-full text-xs">
                <thead>
                  <tr>
                    <th>USER</th>
                    <th>CONTACT</th>
                    <th>SYSTEM ROLE</th>
                    <th>STATUS</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map(s => (
                    <tr key={s._id} className="hover:bg-slate-50">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {s.name?.[0] || 'U'}
                          </div>
                          <span className="font-bold text-slate-900">{s.name || 'User'}</span>
                        </div>
                      </td>
                      <td className="text-slate-500">
                        <div>{s.phoneNumber}</div>
                        <div className="text-[10px] text-slate-400">{s.email || '—'}</div>
                      </td>
                      <td>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase ${ROLE_COLORS[s.role] || 'bg-slate-50 text-slate-700'}`}>
                          {s.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-green text-[10px]">● ACTIVE</span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(s._id, s.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Activity size={16} className="text-blue-600" /> Security Audit Log
          </h3>
          {auditLogs.length > 0 ? (
            <div className="space-y-2">
              {auditLogs.map((log, idx) => (
                <div key={log._id || idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{log.action}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Actor: {log.actorId || 'System'} • Resource: {log.resourceType || 'General'}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No audit records logged yet.</p>
          )}
        </div>
      )}

      {/* ── ADD STAFF MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-up text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Add Staff Account</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  className="input text-xs"
                  placeholder="e.g. Sarah Jenkins"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  className="input text-xs"
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  className="input text-xs"
                  placeholder="name@onemedical.in"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="select w-full text-xs"
                >
                  <option value="clinic_admin">Clinic Admin</option>
                  <option value="admin">Administrator</option>
                  <option value="therapist">Physiotherapist</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary text-xs">
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
