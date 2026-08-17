import { Clock, History, FileText, CheckCircle2 } from 'lucide-react';

export default function ClinicalHistory({ timeline, sessionLogs }) {
  const logs = sessionLogs || [];

  return (
    <div className="card p-6 bg-white border border-slate-200 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <History size={16} className="text-blue-600" /> Clinical History & Session Milestones
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Chronological record of clinical sessions and treatment milestones</p>
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
          {logs.map((log, i) => (
            <div key={log._id || i} className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-100" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {log.title || `Session ${logs.length - i} Completed`}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.completedAt || log.date || log.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {log.notes && <p className="text-xs text-slate-600">{log.notes}</p>}
                {log.durationSeconds && (
                  <div className="text-[11px] text-slate-400">
                    Duration: {Math.round(log.durationSeconds / 60)} mins • Pain Score: {log.postSessionPain ?? log.painLevel ?? '—'}/10
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
          No session history recorded yet.
        </div>
      )}
    </div>
  );
}
