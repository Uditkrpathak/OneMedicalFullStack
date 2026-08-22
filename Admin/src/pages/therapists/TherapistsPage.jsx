import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api } from '../../api/api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';
import {
  Search, Download, Star, ChevronDown, MoreVertical, Plus, User,
  ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle, RefreshCw
} from 'lucide-react';

export default function TherapistsPage() {
  const navigate = useNavigate();
  const token = useSelector(s => s.auth?.accessToken);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, statsRes] = await Promise.allSettled([
        api.listTherapists(token, { page, limit, search: searchQuery }),
        api.getTherapistStats(token),
      ]);

      if (res.status === 'rejected' || !res.value?.data) {
        throw new Error(res.reason?.message || 'Failed to load therapists from server.');
      }

      const statsMap = {};
      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        statsRes.value.data.forEach(s => {
          statsMap[s.therapistId] = s;
        });
      }

      const data = res.value.data.map((t, idx) => {
        const tStats = statsMap[t._id || t.id] || {};
        const pCount = tStats.patientsCount || t.activePatientsCount || 0;
        const name = t.name || t.user?.name || 'Dr. Specialist';
        const qualifications = t.qualifications?.join(', ') || 'BPT, MPT';
        const exp = t.experienceYears || 0;

        return {
          _id: t._id || t.id,
          id: t._id || t.id,
          name,
          degrees: `${qualifications} • ${exp} Years Exp.`,
          avatar: t.profileImageUrl || null,
          initials: name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          specializations: (t.specializations || ['Physiotherapy']).map((spec, i) => ({
            name: spec,
            color: i % 2 === 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-cyan-50 text-cyan-700 border-cyan-100'
          })),
          patientsCount: pCount,
          availability: t.isAvailable ? 'Available Today' : 'On Schedule',
          availabilityColor: t.isAvailable ? 'bg-emerald-500' : 'bg-blue-500',
          rating: t.ratingAvg !== undefined && t.ratingAvg !== null ? t.ratingAvg : null,
          status: (t.verificationStatus === 'verified' || t.isVerified) ? 'VERIFIED' : (t.verificationStatus?.toUpperCase() || 'PENDING'),
          statusBadge: (t.verificationStatus === 'verified' || t.isVerified) 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
            : (t.verificationStatus === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'),
        };
      });

      setTherapists(data);
      setTotal(res.value.meta?.total ?? data.length);
    } catch (err) {
      console.error('Error listing therapists:', err);
      setError(err.message || 'Failed to load therapists from server.');
    } finally {
      setLoading(false);
    }
  }, [token, page, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const uniqueSpecs = ['All', ...Array.from(new Set(therapists.flatMap(t => t.specializations.map(s => s.name))))];

  const filteredTherapists = therapists.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.degrees.toLowerCase().includes(q);
    const matchStatus = selectedStatus === 'All' || t.status === selectedStatus;
    const matchSpec = selectedSpec === 'All' || t.specializations.some(s => s.name === selectedSpec);
    return matchSearch && matchStatus && matchSpec;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── 1. HEADER AREA ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Therapists</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage practitioners, schedules, patient capacities and verifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary text-xs font-bold py-2.5 px-5 bg-blue-700 hover:bg-blue-600 shadow-sm rounded-full flex items-center gap-1.5"
            onClick={() => navigate('/therapists/add')}
          >
            <Plus size={15} /> Add Therapist
          </button>
        </div>
      </div>

      {/* ── 2. SEARCH & FILTER BAR ── */}
      <div className="flex flex-wrap justify-between items-center gap-3 card p-3 shadow-sm bg-white border border-slate-200/80 rounded-2xl">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-100 rounded-full px-3.5 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search therapists by name or qualification..."
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-medium"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="relative">
            <select
              className="select text-xs py-2 px-4 rounded-full bg-slate-50 border border-slate-200 font-semibold text-slate-700 pr-8 appearance-none cursor-pointer"
              value={selectedSpec}
              onChange={e => setSelectedSpec(e.target.value)}
            >
              {uniqueSpecs.map(s => <option key={s} value={s}>{s === 'All' ? 'All Specializations' : s}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              className="select text-xs py-2 px-4 rounded-full bg-slate-50 border border-slate-200 font-semibold text-slate-700 pr-8 appearance-none cursor-pointer"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="All">Status: All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── 3. 4-STATE CONTAINER ── */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Therapists</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={load} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filteredTherapists.length === 0 ? (
        <EmptyState
          title="No therapists found"
          subtitle={searchQuery ? 'No therapists match your search criteria.' : 'There are currently no specialists registered in the directory.'}
          actionLabel="Register Therapist"
          onAction={() => navigate('/therapists/add')}
        />
      ) : (
        <div className="card overflow-hidden shadow-sm border border-slate-200/80 rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="tbl w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3.5 px-5 text-left">Therapist</th>
                  <th className="py-3.5 px-4 text-left">Specialization</th>
                  <th className="py-3.5 px-4 text-center">Patient Load & Capacity</th>
                  <th className="py-3.5 px-4 text-left">Availability</th>
                  <th className="py-3.5 px-4 text-center">Rating</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTherapists.map((t) => (
                  <tr
                    key={t._id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => navigate(`/therapists/${t._id}`)}
                  >
                    {/* Therapist Info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {t.avatar ? (
                          <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {t.initials}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">{t.name}</h4>
                          <p className="text-[11px] text-slate-400 font-medium">{t.degrees}</p>
                        </div>
                      </div>
                    </td>

                    {/* Specialization Tags */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {t.specializations.map((spec, idx) => (
                          <span key={idx} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${spec.color}`}>
                            {spec.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Patient Load & Capacity Indicator */}
                    <td className="py-4 px-4">
                      <div className="space-y-1 w-32 mx-auto text-center">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-900">{t.patientsCount} Patients</span>
                          <span className={t.patientsCount > 30 ? 'text-amber-600' : 'text-blue-600'}>
                            {Math.min(100, Math.round((t.patientsCount / 40) * 100))}%
                          </span>
                        </div>
                        <div className="progress-track h-1.5 bg-slate-100">
                          <div
                            className={`progress-fill ${t.patientsCount > 30 ? 'bg-amber-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, Math.round((t.patientsCount / 40) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Availability */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-700">
                        <span className={`w-2 h-2 rounded-full ${t.availabilityColor}`} />
                        {t.availability}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <Star size={13} className="text-amber-400 fill-amber-400" />
                        {t.rating.toFixed(1)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <span className={`badge text-[9px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase ${t.statusBadge}`}>
                        {t.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/therapists/${t._id}`)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 4. FOOTER PAGINATION ── */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs text-slate-500 font-medium">
            <span>Showing {filteredTherapists.length} of {total} specialists</span>

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
      )}
    </div>
  );
}
