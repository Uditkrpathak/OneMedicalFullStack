import { Activity, Clock, ShieldCheck } from 'lucide-react';

export default function AuditTimelineSection({ auditLogs }) {
  const logs = auditLogs || [];

  return (
    <div className="card p-6 bg-white border border-slate-200 space-y-5">
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Activity size={16} className="text-blue-600" /> Patient Audit & Access Trail
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">HIPAA compliance audit trail of record access, profile updates, and clinical events</p>
      </div>

      {logs.length > 0 ? (
        <div className="space-y-2">
          {logs.map((l, i) => (
            <div key={l._id || i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900">{l.action}</div>
                <div className="text-[11px] text-slate-400">
                  Actor: <strong className="text-slate-600">{l.actorId || 'System'}</strong> • Resource: {l.resourceType || 'PatientRecord'}
                </div>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                <Clock size={11} /> {new Date(l.createdAt).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
          No audit logs recorded for this patient yet.
        </div>
      )}
    </div>
  );
}
