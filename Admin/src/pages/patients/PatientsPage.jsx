import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Filter, Download, MoreVertical, Eye, ArrowUpDown, ChevronLeft, ChevronRight,
  LayoutGrid, Table as TableIcon, FileText, UserPlus, TrendingUp, CheckCircle, Activity,
  AlertCircle, RefreshCw
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
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Patients</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage real patient records, treatment plans, and recovery scores.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button className="btn btn-primary text-xs" onClick={() => navigate('/patients/add')}>
            <UserPlus size={15} /> Add Patient
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH CARD */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients by name, ID or condition..."
              className="input pl-9 text-xs py-2.5 w-full bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon size={14} /> Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={14} /> Cards
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-slate-100 pt-3 text-xs gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select className="select text-xs py-1.5 bg-slate-50 flex-1 sm:w-40 min-w-[130px]" value={conditionFilter} onChange={e => setCondition(e.target.value)}>
              {uniqueConditions.map(c => <option key={c} value={c}>{c === 'All' ? 'All Conditions' : c}</option>)}
            </select>

            <select className="select text-xs py-1.5 bg-slate-50 flex-1 sm:w-36 min-w-[120px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">Status: All</option>
              <option value="Active Treatment">Active Treatment</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="shrink-0">SORT BY:</span>
            <select className="select text-xs py-1.5 bg-slate-50 w-full sm:w-36 font-bold text-slate-800" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="Recently Updated">Recently Updated</option>
              <option value="Recovery Score">Recovery Score</option>
              <option value="Name A-Z">Name A-Z</option>
            </select>
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
                  <tr key={p._id} className="cursor-pointer" onClick={() => navigate(`/patients/${p._id}`)}>
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
                      <button onClick={() => navigate(`/patients/${p._id}`)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600">
                        <Eye size={16} />
                      </button>
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
            <div key={p._id} className="card p-5 space-y-3 cursor-pointer card-hover" onClick={() => navigate(`/patients/${p._id}`)}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border-2 border-blue-200">
                  {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : (p.name[0] || 'P')}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-400">{p.phoneNumber} • #{p.id}</p>
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
    </div>
  );
}
