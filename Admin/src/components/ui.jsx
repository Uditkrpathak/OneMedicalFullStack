import { useState } from 'react';

/* Shared UI Components — Tailwind CSS */

export function StatCard({ icon: Icon, label, value, change, changeDir = 'up', iconBg = 'bg-blue-50', iconColor = 'text-blue-600' }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{value ?? '—'}</p>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={20} className={iconColor} />
          </div>
        )}
      </div>
      {change && (
        <p className={`text-xs font-semibold ${changeDir === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
          {changeDir === 'up' ? '↑' : '↓'} {change}
        </p>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}





export function UserAvatar({ name = '', src = '', className = 'w-9 h-9', alt = '' }) {
  const [failed, setFailed] = useState(false);

  // Clean initials (e.g. Dr. Priya Sharma -> PS)
  const cleanName = (name || 'User').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '');
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    'bg-[#003882] text-white',
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
    'bg-teal-600 text-white',
    'bg-purple-600 text-white',
  ];
  const charSum = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colorClass = colors[charSum % colors.length];

  let fullSrc = src;
  if (src && src.startsWith('/') && !src.startsWith('//')) {
    fullSrc = `${window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'https://onemedical-v2-gateway.onrender.com'}${src}`;
  }

  if (!src || failed) {
    return (
      <div
        className={`${className} rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs ring-1 ring-slate-200`}
        title={name || alt}
      >
        {initials || 'OM'}
      </div>
    );
  }

  return (
    <img
      src={fullSrc}
      alt={alt || name}
      className={`${className} rounded-full object-cover shrink-0 ring-1 ring-slate-200`}
      onError={() => setFailed(true)}
    />
  );
}

export function Avatar({ name, src, size = 'sm' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  };
  const cls = sizeClasses[size] || 'w-8 h-8 text-xs';
  return <UserAvatar name={name} src={src} className={cls} />;
}

export function SearchInput({ value, onChange, placeholder = 'Search…', id }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        id={id}
        className="input pl-8"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export function Pagination({ page, total, limit = 10, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
      <span className="text-slate-400 font-medium text-center sm:text-left">
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all"
        >
          ←
        </button>
        {pages.map((p, i) => (
          p === '…'
            ? <span key={i} className="px-2 text-slate-400">…</span>
            : <button
                key={p}
                onClick={() => onChange(p)}
                className={`px-3 py-1.5 rounded-xl border font-bold transition-all ${
                  p === page
                    ? 'bg-[#003882] text-white border-[#003882]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-all"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Modal ───────────────────────────────────────────────────────────
export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors ${
              danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#003882] hover:bg-[#002b66]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  CONFIRMED:  'bg-sky-50 text-sky-700 border-sky-200',
  Confirmed:  'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Completed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING:    'bg-amber-50 text-amber-700 border-amber-200',
  Pending:    'bg-amber-50 text-amber-700 border-amber-200',
  Scheduled:  'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED:  'bg-rose-50 text-rose-600 border-rose-200',
  Cancelled:  'bg-rose-50 text-rose-600 border-rose-200',
  PAID:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUBLISHED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  DRAFT:      'bg-slate-100 text-slate-600 border-slate-200',
  ACTIVE:     'bg-blue-50 text-blue-700 border-blue-200',
  INACTIVE:   'bg-slate-100 text-slate-500 border-slate-200',
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${style}`}>
      {status}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon size={24} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2 bg-[#003882] text-white text-xs font-bold rounded-full hover:bg-[#002b66] transition-all"
        >
          {action}
        </button>
      )}
    </div>
  );
}

