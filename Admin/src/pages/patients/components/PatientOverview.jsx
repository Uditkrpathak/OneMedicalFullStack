import { Activity, Flame, Target, Calendar, CheckCircle2, Dumbbell, ShieldCheck } from 'lucide-react';

export default function PatientOverview({ patient, activeProgram, painData, appointments }) {
  const recoveryScore = activeProgram?.recoveryScore ?? patient?.recoveryScore ?? 70;
  const latestPain = painData?.latest ?? (patient?.painLevel || 4);
  const nextAppt = appointments?.find(a => a.status === 'CONFIRMED' || a.status === 'confirmed');

  return (
    <div className="space-y-6">
      {/* 4 TOP WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Recovery Score</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{recoveryScore}%</div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${recoveryScore}%` }} />
          </div>
        </div>

        <div className="card p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Current Pain Level</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{latestPain} <span className="text-xs font-normal text-slate-400">/ 10</span></div>
          <p className="text-xs text-slate-500 mt-2">
            {latestPain <= 3 ? 'Mild discomfort' : latestPain <= 6 ? 'Moderate pain' : 'Severe discomfort'}
          </p>
        </div>

        <div className="card p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Next Scheduled Visit</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900">
            {nextAppt ? (
              <>
                <div>{new Date(nextAppt.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div className="text-xs text-purple-600 font-semibold mt-0.5">
                  {new Date(nextAppt.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • {nextAppt.appointmentPlace || 'Clinic'}
                </div>
              </>
            ) : (
              <span className="text-slate-400 font-medium text-xs">No upcoming sessions</span>
            )}
          </div>
        </div>

        <div className="card p-5 bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Active Program</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target size={16} />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {activeProgram ? (activeProgram.title || activeProgram.programId?.title || 'Care Protocol Active') : 'No Program Assigned'}
          </div>
          <p className={`text-xs font-semibold mt-1 ${activeProgram ? 'text-emerald-600' : 'text-slate-400'}`}>
            {activeProgram ? `Week ${activeProgram.currentWeek || 1} of ${activeProgram.targetWeeks || 8}` : 'Pending assignment'}
          </p>
        </div>
      </div>

      {/* ACTIVE CARE PROTOCOL CARD */}
      <div className="card p-6 bg-white border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Active Rehabilitation Protocol</h3>
            <p className="text-xs text-slate-500 mt-0.5">Assigned exercises and milestone targets</p>
          </div>
          <span className={`badge text-xs font-bold ${activeProgram ? 'badge-blue' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
            {activeProgram?.status?.toUpperCase() || 'NO PROGRAM ASSIGNED'}
          </span>
        </div>

        {activeProgram ? (
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  {activeProgram.title || activeProgram.programId?.title || 'Customized Rehabilitation Plan'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeProgram.description || activeProgram.programId?.description || 'Prescribed targeted movements and functional recovery plan.'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-slate-700">Frequency: 3x / week</div>
                <div className="text-[11px] text-slate-400">Duration: {activeProgram.targetWeeks || 8} Weeks</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
            No active rehabilitation program currently assigned to this patient. Use <strong>Assign Program</strong> at the top to prescribe a recovery protocol.
          </div>
        )}
      </div>
    </div>
  );
}
