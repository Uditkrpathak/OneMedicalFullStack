import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Filter, Download, MoreVertical, Eye, ArrowUpDown, ChevronLeft, ChevronRight,
  LayoutGrid, Table as TableIcon, FileText, UserPlus, TrendingUp, CheckCircle, Activity,
  AlertCircle, RefreshCw, Trash2, RotateCcw, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { api } from '../../api/api.js';
import { PageHeader, Spinner, EmptyState } from '../../components/ui.jsx';

export default function PatientsPage() {
  const token    = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();

  const [patients, setPatients]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [viewMode, setViewMode]         = useState('table'); // 'table' | 'cards'
  const [searchQuery, setSearchQuery]   = useState('');
  const [conditionFilter, setCondition] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy]             = useState('Recently Updated');
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [toastMsg, setToastMsg]         = useState(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listPatients(token, { page, limit, search: searchQuery });
      const rawList = res?.data || [];
      const formatted = rawList.map((u, idx) => ({
        _id: u._id,
        id: u._id?.slice(-6)?.toUpperCase() || `PT-${idx + 1001}`,
        name: u.name || 'Patient',
        email: u.email || '—',
        phoneNumber: u.phoneNumber || '—',
        ageGender: u.profile?.age ? `${u.profile.age}, ${u.profile.gender || 'Not Specified'}` : (u.profile?.gender || 'Patient'),
        condition: u.profile?.primaryConcern || u.profile?.condition || 'Physiotherapy Care',
        therapist: u.profile?.assignedTherapistName || 'Assigned Specialist',
        nextAppointment: u.profile?.nextAppointmentDate ? new Date(u.profile.nextAppointmentDate).toLocaleDateString('en-IN') : 'Scheduled via Care Plan',
        recoveryScore: u.profile?.recoveryScore || u.progress || 0,
        status: u.isActive !== false ? 'Active Treatment' : 'Inactive',
        avatar: u.profileImageUrl || u.profile?.profileImageUrl || u.avatarUrl || u.avatar || null,
      }));
      setPatients(formatted);
      setTotal(res?.meta?.total ?? formatted.length);
    } catch (err) {
      console.error('Failed to load patients:', err);
      setError(err.message || 'Failed to load patients from server.');
    } finally {
      setLoading(false);
    }
  }, [token, page, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirmSoftDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deletePatient(token, patientToDelete._id);
      if (res?.success) {
        setToastMsg(`Patient ${patientToDelete.name} has been deactivated & archived successfully.`);
        setTimeout(() => setToastMsg(null), 4000);
        setPatientToDelete(null);
        load();
      } else {
        alert(res?.error?.message || 'Failed to deactivate patient.');
      }
    } catch (err) {
      alert(err.message || 'Error deactivating patient.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Working Filters & Search Logic
  const filteredPatients = patients.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.condition.toLowerCase().includes(q);
    const matchCond   = conditionFilter === 'All' || p.condition.toLowerCase().includes(conditionFilter.toLowerCase());
    const matchStat   = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchCond && matchStat;
  });

  const uniqueConditions = ['All', ...Array.from(new Set(patients.map(p => p.condition).filter(Boolean)))];

  // Dynamic Metrics
  const activeCount = patients.filter(p => p.status === 'Active Treatment').length;
  const avgRecovery = patients.length > 0 ? Math.round(patients.reduce((acc, p) => acc + (p.recoveryScore || 0), 0) / patients.length) : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-slate-700 animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Patient Registry"
          subtitle="Manage active rehabilitation patients, clinical profiles, and care regimens."
        />
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/patients/add')} className="btn btn-primary text-xs flex items-center gap-1.5 shadow-xs">
            <UserPlus size={14} /> Add Patient
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or condition..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              className="inp pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <select
              value={conditionFilter}
              onChange={e => setCondition(e.target.value)}
              className="inp text-xs py-1.5 px-3 bg-white"
            >
              {uniqueConditions.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Clinical Conditions' : c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="inp text-xs py-1.5 px-3 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Active Treatment">Active Treatment</option>
              <option value="Inactive">Inactive</option>
            </select>

            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-400'}`}
              >
                <TableIcon size={14} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md ${viewMode === 'cards' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-400'}`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4-STATE CONTAINER ─── */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Patients</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={load} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          title="No patients found"
          subtitle={searchQuery ? 'No patients matched your search criteria.' : 'There are currently no patients registered in the clinic database.'}
          actionLabel="Add First Patient"
          onAction={() => navigate('/patients/add')}
        />
      ) : viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl w-full min-w-[800px]">
              <thead>
                <tr>
                  <th>PATIENT</th>
                  <th>PATIENT ID</th>
                  <th>CONDITION</th>
                  <th>PHONE / EMAIL</th>
                  <th>RECOVERY SCORE</th>
                  <th>STATUS</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr key={p._id} className="cursor-pointer group" onClick={() => navigate(`/patients/${p._id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-blue-200">
                          {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : (p.name[0] || 'P')}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.ageGender}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                        #{p.id}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-blue text-[10px] uppercase font-bold">{p.condition}</span>
                    </td>
                    <td className="text-xs text-slate-600">
                      <div>{p.phoneNumber}</div>
                      <div className="text-[10px] text-slate-400">{p.email}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 progress-track"><div className="progress-fill" style={{ width: `${p.recoveryScore}%` }} /></div>
                        <span className="font-bold text-xs text-slate-800">{p.recoveryScore}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={p.status === 'Active Treatment' ? 'badge-blue text-[10px]' : 'badge-slate text-[10px]'}>
                        ● {p.status}
                      </span>
                    </td>
                    <td className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/patients/${p._id}`)}
                          title="View Patient Record"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setPatientToDelete(p)}
                          title="Soft-Delete / Deactivate Patient"
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-medium">
            <span>Showing {filteredPatients.length} of {total} patients</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                Page {page} of {Math.max(1, Math.ceil(total / limit))}
              </span>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map(p => (
            <div key={p._id} className="card p-5 space-y-3 cursor-pointer card-hover group" onClick={() => navigate(`/patients/${p._id}`)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border-2 border-blue-200">
                    {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : (p.name[0] || 'P')}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-400">{p.phoneNumber} • #{p.id}</p>
                  </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setPatientToDelete(p)}
                    title="Soft-Delete / Deactivate Patient"
                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between"><span className="text-slate-400">Condition:</span> <span className="font-bold text-slate-800">{p.condition}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Status:</span> <span className="font-semibold text-slate-700">{p.status}</span></div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                    <span>RECOVERY SCORE</span><span>{p.recoveryScore}%</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${p.recoveryScore}%` }} /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REAL METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="card p-5 flex items-center gap-4 border-l-4 border-l-blue-600">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Total Patients Enrolled</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{total}</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 border-l-4 border-l-emerald-600">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Average Recovery Score</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{avgRecovery}%</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 border-l-4 border-l-purple-600">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">Active in Treatment</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* ─── SOFT DELETE CONFIRMATION MODAL ─── */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-5 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0 border border-red-200">
                <ShieldAlert size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Deactivate & Archive Patient</h3>
                <p className="text-xs text-slate-500">Soft-delete patient account</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <span>{patientToDelete.name}</span>
                <span className="font-mono text-blue-600">#{patientToDelete.id}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Deactivating this patient will immediately disable their login access.
              </p>
              <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-800 font-medium">
                💡 <strong>HIPAA Retention Safe</strong>: All consultation history, prescriptions, uploaded documents, and billing tax invoices remain securely archived.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPatientToDelete(null)}
                className="btn btn-secondary text-xs px-4 py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmSoftDelete}
                className="btn btn-primary text-xs px-4 py-2.5 bg-red-600 hover:bg-red-700 border-red-600 text-white flex items-center gap-2 shadow-xs"
              >
                {isDeleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
                <span>{isDeleting ? 'Deactivating...' : 'Confirm Soft Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
