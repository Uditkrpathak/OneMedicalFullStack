import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Star, Search, Filter, CheckCircle2, AlertTriangle, EyeOff, ShieldCheck,
  ThumbsUp, RefreshCw, MessageSquare, User, Stethoscope, ChevronRight,
  TrendingUp, Award, Check, X, Flag, AlertCircle
} from 'lucide-react';
import { api } from '../../api/api.js';
import { PageHeader, Spinner, EmptyState, UserAvatar } from '../../components/ui.jsx';

export default function ReviewsPage() {
  const token = useSelector(s => s.auth?.accessToken);

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ total: 0, published: 0, flagged: 0, hidden: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);

  // Moderation modal
  const [selectedReview, setSelectedReview] = useState(null);
  const [modStatus, setModStatus] = useState('PUBLISHED');
  const [modReason, setModReason] = useState('');
  const [modLoading, setModLoading] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (ratingFilter !== 'All') params.rating = ratingFilter;

      const res = await api.listAdminReviews(token, params);
      if (res?.success) {
        setReviews(res.data || []);
        if (res.summary) setSummary(res.summary);
      } else {
        setReviews(res?.data || []);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setError(err.message || 'Failed to load reviews from server.');
    } finally {
      setLoading(false);
    }
  }, [token, page, searchQuery, statusFilter, ratingFilter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleModerate = async () => {
    if (!selectedReview) return;
    setModLoading(true);
    try {
      const res = await api.moderateReviewStatus(token, selectedReview._id, {
        status: modStatus,
        reason: modReason || `Admin moderation: ${modStatus}`,
      });

      if (res?.success) {
        showToast(`Review #${selectedReview._id.slice(-6).toUpperCase()} updated to ${modStatus}`);
        setSelectedReview(null);
        setModReason('');
        loadReviews();
      } else {
        alert(res?.error?.message || 'Failed to update review status.');
      }
    } catch (err) {
      alert(err.message || 'Error moderating review.');
    } finally {
      setModLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Published' };
      case 'FLAGGED':
        return { style: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Flagged for Review' };
      case 'HIDDEN':
        return { style: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Hidden / Excluded' };
      default:
        return { style: 'bg-slate-50 text-slate-700 border-slate-200', label: status };
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* TOAST */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border border-slate-700">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <PageHeader
        title="Doctor Reviews & Feedback"
        subtitle="Manage verified patient ratings, clinical feedback, and authoritative doctor reputation metrics."
        actions={
          <button
            onClick={loadReviews}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Reviews</div>
            <div className="text-xl font-extrabold text-slate-900">{summary.total}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Published & Active</div>
            <div className="text-xl font-extrabold text-emerald-700">{summary.published}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Flagged for Review</div>
            <div className="text-xl font-extrabold text-amber-700">{summary.flagged}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <EyeOff size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hidden / Moderated</div>
            <div className="text-xl font-extrabold text-rose-700">{summary.hidden}</div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctor, patient, comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {['All', 'PUBLISHED', 'FLAGGED', 'HIDDEN'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st === 'All' ? 'All Status' : st === 'PUBLISHED' ? 'Published' : st === 'FLAGGED' ? 'Flagged' : 'Hidden'}
              </button>
            ))}
          </div>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="All">All Ratings (★)</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* REVIEWS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Spinner size="lg" />
            <span className="text-xs font-semibold">Loading doctor reviews...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center">
            <EmptyState
              title="No Reviews Found"
              description="No patient consultation reviews match the current search or filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Patient</th>
                  <th className="py-3.5 px-5">Doctor / Specialist</th>
                  <th className="py-3.5 px-5">Rating & Metrics</th>
                  <th className="py-3.5 px-5">Consultation Feedback</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {reviews.map((r) => {
                  const badge = getStatusBadge(r.status);
                  const dateFormatted = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/75 transition-colors">
                      {/* PATIENT */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={r.patientAvatarUrl}
                            name={r.patientName}
                            className="w-9 h-9"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{r.patientName}</span>
                              {r.isAnonymous && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-extrabold">
                                  ANON
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <ShieldCheck size={12} className="text-emerald-600" />
                              <span>Verified Consultation</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* DOCTOR */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 leading-snug">{r.doctorName}</div>
                        <div className="text-[11px] text-slate-400">Date: {dateFormatted}</div>
                      </td>

                      {/* RATING */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={13}
                              className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
                            />
                          ))}
                          <span className="font-extrabold text-slate-900 ml-1">{r.rating}.0</span>
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5">
                          <div>Comm: {r.communicationRating || 5}/5 • Expl: {r.explanationRating || 5}/5</div>
                          <div>Wait: {r.waitTimeRating || '< 15 mins'}</div>
                        </div>
                      </td>

                      {/* FEEDBACK COMMENT & TAGS */}
                      <td className="py-4 px-5 max-w-md">
                        <p className="text-slate-800 text-xs line-clamp-2 leading-relaxed">
                          "{r.reviewText || r.comment}"
                        </p>
                        {r.tags && r.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {r.tags.map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">
                                ✓ {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <ThumbsUp size={11} className="text-slate-400" /> {r.helpfulCount || 0} helpful votes
                          </span>
                          {r.npsScore && <span>• NPS: {r.npsScore}/10</span>}
                        </div>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.style}`}>
                          ● {badge.label}
                        </span>
                        {r.moderationReason && (
                          <div className="text-[10px] text-slate-400 mt-1 max-w-[140px] truncate" title={r.moderationReason}>
                            Reason: {r.moderationReason}
                          </div>
                        )}
                      </td>

                      {/* MODERATION ACTION */}
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => {
                            setSelectedReview(r);
                            setModStatus(r.status);
                            setModReason(r.moderationReason || '');
                          }}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Flag size={12} className="text-slate-500" />
                          <span>Moderate</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODERATION MODAL */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm">
                  <Star size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Moderate Patient Review</h3>
                  <p className="text-[11px] text-slate-400">Review for {selectedReview.doctorName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* REVIEW PREVIEW */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{selectedReview.patientName}</span>
                <span className="font-extrabold text-amber-600">{selectedReview.rating} ★</span>
              </div>
              <p className="text-xs text-slate-700 italic">"{selectedReview.reviewText || selectedReview.comment}"</p>
            </div>

            {/* STATUS SELECTOR */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Publication Status</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'PUBLISHED', label: 'Published', desc: 'Included in ratings', color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                  { id: 'FLAGGED', label: 'Flagged', desc: 'Needs scrutiny', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                  { id: 'HIDDEN', label: 'Hidden', desc: 'Excluded from ratings', color: 'border-rose-500 bg-rose-50 text-rose-900' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setModStatus(s.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      modStatus === s.id ? `${s.color} font-extrabold ring-2 ring-blue-600` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] opacity-75">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* REASON INPUT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Moderation Notes / Reason</label>
              <textarea
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder="Specify reason for moderation (e.g. Verified clinical feedback, Inappropriate language, Resolved dispute)..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none"
                rows={3}
              />
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModerate}
                disabled={modLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {modLoading ? <Spinner size="sm" /> : <Check size={14} />}
                Save & Recalculate Ratings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
