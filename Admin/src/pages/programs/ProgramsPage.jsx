import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Filter, Grid, List, MoreVertical, Download, Share2,
  Archive, Trash2, Clock, Users, CheckCircle2, Layers,
  ChevronRight, Edit2, Eye, TrendingUp, Star, AlertCircle, RefreshCw
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';

const DIFF_COLORS = {
  Intermediate: 'text-amber-700 bg-amber-50 border-amber-200',
  Beginner:     'text-emerald-700 bg-emerald-50 border-emerald-200',
  Advanced:     'text-rose-700 bg-rose-50 border-rose-200',
};

export default function ProgramsPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('All');
  const [openMenu, setOpenMenu] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listPrograms(token);
      const list = res?.data || [];
      setPrograms(list.map((p, i) => ({
        _id: p._id,
        status: (p.status || 'PUBLISHED').toUpperCase(),
        title: p.title || 'Recovery Program',
        desc: p.description || p.desc || 'Comprehensive rehabilitation protocol.',
        duration: p.durationWeeks ? `${p.durationWeeks} Weeks` : (p.duration || '8 Weeks'),
        difficulty: p.difficulty || 'Intermediate',
        patients: p.enrolledPatientsCount || p.activePatients || 0,
        completion: p.completionRate || 85,
        phasesCount: p.phases?.length || 1,
      })));
    } catch (err) {
      console.error('Failed to load programs:', err);
      setError(err.message || 'Failed to load rehabilitation programs.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this rehabilitation program?')) return;
    try {
      await api.deleteProgram(token, id);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete program.');
    }
  };

  const filtered = programs.filter(p =>
    statusFilter === 'All' || p.status === statusFilter
  );

  return (
    <div className="space-y-6 animate-fade-up text-slate-800">
      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Rehabilitation Programs</h1>
          <p className="text-xs text-slate-500 mt-1">Design, assign and monitor structured clinical recovery pathways.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/programs/create')}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={15} /> Create Program
          </button>
        </div>
      </div>

      {/* ─── FILTER BAR ─── */}
      <div className="card p-4 bg-white border border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['All', 'PUBLISHED', 'DRAFT', 'ACTIVE'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded-lg ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-400'}`}
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded-lg ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-400'}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ─── 4-STATE CONTAINER ─── */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Programs</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={load} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No programs found"
          subtitle="There are currently no rehabilitation protocols configured in the system."
          actionLabel="Create First Program"
          onAction={() => navigate('/programs/create')}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => (
            <div
              key={p._id}
              onClick={() => navigate(`/programs/${p._id}`)}
              className="card p-5 bg-white border border-slate-200 space-y-4 cursor-pointer card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="badge badge-blue text-[10px] font-bold">● {p.status}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${DIFF_COLORS[p.difficulty] || 'bg-slate-50 text-slate-700'}`}>
                  {p.difficulty}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock size={12} /> {p.duration}</span>
                <span className="flex items-center gap-1"><Layers size={12} /> {p.phasesCount} Phases</span>
                <button
                  onClick={e => handleDelete(p._id, e)}
                  className="p-1 hover:text-red-600 transition-colors"
                  title="Delete program"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden bg-white border border-slate-200">
          <table className="tbl w-full text-xs">
            <thead>
              <tr>
                <th>PROGRAM NAME</th>
                <th>DIFFICULTY</th>
                <th>DURATION</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id} onClick={() => navigate(`/programs/${p._id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="font-bold text-slate-900">{p.title}</td>
                  <td>{p.difficulty}</td>
                  <td>{p.duration}</td>
                  <td><span className="badge badge-blue text-[10px]">● {p.status}</span></td>
                  <td className="text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={e => handleDelete(p._id, e)} className="p-1 text-slate-400 hover:text-red-600">
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
  );
}
