import { Layers, Target, Clock, Dumbbell, CheckCircle2, Plus, Sparkles, AlertCircle } from 'lucide-react';

export default function ProgramsSection({ programs = [], activeProgram, onAssignNew }) {
  // If array of programs is provided, use it; otherwise fallback to [activeProgram]
  const programList = programs.length > 0
    ? programs
    : (activeProgram ? [activeProgram] : []);

  if (programList.length === 0) {
    return (
      <div className="card p-10 bg-white border border-slate-200 text-center space-y-3 rounded-2xl shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Layers size={28} />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">No Rehabilitation Programs Assigned</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Prescribe targeted physical therapy protocols, progressive weekly phases, and customized home exercise drills for this patient.
        </p>
        {onAssignNew && (
          <button
            onClick={onAssignNew}
            className="btn btn-primary text-xs font-bold py-2.5 px-4 bg-[#003882] hover:bg-[#002b66] text-white rounded-xl flex items-center gap-2 mx-auto shadow-sm"
          >
            <Plus size={15} /> Assign First Program
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER ROW WITH ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <span>Assigned Care Protocols</span>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              {programList.length} {programList.length === 1 ? 'Program' : 'Programs'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active and concurrent physical therapy regimens prescribed for this patient.
          </p>
        </div>

        {onAssignNew && (
          <button
            onClick={onAssignNew}
            className="btn btn-primary text-xs font-bold py-2 px-3.5 bg-[#003882] hover:bg-[#002b66] text-white rounded-xl flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus size={14} /> Assign Another Program
          </button>
        )}
      </div>

      {/* MULTIPLE PROGRAM CARDS */}
      <div className="space-y-6">
        {programList.map((assignedProg, idx) => {
          const progTemplate = assignedProg.programId || assignedProg;
          const currentWeek = assignedProg.currentWeek || 1;
          const targetWeeks = assignedProg.targetWeeks || progTemplate.durationWeeks || 8;
          const status = (assignedProg.status || 'active').toUpperCase();
          const exercises = progTemplate.phases?.[0]?.exercises || progTemplate.exercises || [];
          const progressPercent = assignedProg.progressPercent || Math.round((currentWeek / targetWeeks) * 100);

          return (
            <div key={assignedProg._id || idx} className="card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-5">
              
              {/* TOP PROGRAM HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-base font-black text-slate-900 tracking-tight">
                      {assignedProg.title || progTemplate.title || `Protocol ${idx + 1}`}
                    </h4>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : status === 'PAUSED'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      ● {status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl">
                    {progTemplate.description || 'Customized physical therapy regimen prescribed to improve mobility and reduce pain.'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl text-right shrink-0 min-w-[140px]">
                  <div className="text-xs font-extrabold text-slate-900">Week {currentWeek} of {targetWeeks}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {assignedProg.targetSessionsPerWeek || 3} Sessions / week
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, progressPercent)}%` }} />
                  </div>
                </div>
              </div>

              {/* PRESCRIBED EXERCISES GRID */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Dumbbell size={14} className="text-blue-600" /> Prescribed Exercises ({exercises.length})
                  </h5>
                  <span className="text-[11px] text-slate-400 font-medium">Phase 1 • Foundational Mobility</span>
                </div>

                {exercises.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {exercises.map((ex, i) => (
                      <div key={i} className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/70 flex items-center gap-3 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {ex.exerciseId?.name || ex.name || `Exercise Item ${i + 1}`}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {ex.sets ? `${ex.sets} sets × ${ex.reps || '10'} reps` : (ex.duration || '5 mins')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">No exercises configured in this phase.</p>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
