import { Clock, History, FileText, CheckCircle2, Calendar, Stethoscope, Dumbbell, Award, AlertCircle } from 'lucide-react';

export default function ClinicalHistory({ timeline, sessionLogs = [], appointments = [], assignedPrograms = [], activeProgram, medicalInfo, patient }) {
  // Aggregate unified clinical history items chronologically
  const items = [];

  // 1. Session Logs (Workouts & Daily Exercises)
  (sessionLogs || []).forEach(log => {
    const rawDate = log.completedAt || log.date || log.createdAt;
    items.push({
      id: `session_${log._id || Math.random()}`,
      type: 'SESSION',
      title: log.title || 'Rehabilitation Exercise Session',
      date: new Date(rawDate),
      dateStr: new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeStr: new Date(rawDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      badge: 'EXERCISE SESSION',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Dumbbell,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      details: [
        log.durationSeconds ? `Duration: ${Math.round(log.durationSeconds / 60)} mins` : null,
        log.painLevel !== undefined ? `Pain Score: ${log.painLevel}/10` : null,
        log.perceivedExertionRPE ? `Exertion: RPE ${log.perceivedExertionRPE}/10` : null,
        log.exercisesCompleted?.length ? `${log.exercisesCompleted.length} Exercises Completed` : null,
      ].filter(Boolean).join(' • '),
      notes: log.notes,
    });
  });

  // 2. Clinical Appointments & Consultations
  (appointments || []).forEach(apt => {
    const rawDate = apt.startTime || apt.date || apt.createdAt;
    const isCompleted = ['COMPLETED', 'DOCUMENTED'].includes(apt.status);
    const place = (apt.appointmentPlace || 'Clinic').toUpperCase();
    
    items.push({
      id: `appt_${apt._id || Math.random()}`,
      type: 'APPOINTMENT',
      title: `${place === 'VIDEO' ? 'Virtual Video Consultation' : (place === 'HOME' ? 'Home Visit Consultation' : 'In-Clinic Assessment')} with ${apt.therapistName || 'Specialist'}`,
      date: new Date(rawDate),
      dateStr: new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeStr: new Date(rawDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      badge: apt.status || 'CONFIRMED',
      badgeColor: isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Stethoscope,
      iconColor: isCompleted ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-blue-600 bg-blue-50 border-blue-200',
      details: [
        apt.type || 'Physical Rehabilitation',
        apt.durationMin ? `${apt.durationMin} mins` : '30 mins',
        apt.amount ? `₹${apt.amount > 5000 ? Math.round(apt.amount / 100) : apt.amount} (${apt.paymentStatus || 'PAID'})` : null,
      ].filter(Boolean).join(' • '),
      notes: apt.clinicalSummary?.diagnosis || apt.notes || `Scheduled clinical session for ${apt.patientName || 'patient'}.`,
    });
  });

  // 3. Program Assignment Milestones
  (assignedPrograms || []).forEach(prog => {
    const rawDate = prog.createdAt || prog.assignedAt || Date.now();
    items.push({
      id: `prog_${prog._id || Math.random()}`,
      type: 'PROGRAM',
      title: `Rehabilitation Program Assigned: ${prog.title || prog.programName || 'Active Care Protocol'}`,
      date: new Date(rawDate),
      dateStr: new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeStr: new Date(rawDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      badge: (prog.status || 'ACTIVE').toUpperCase(),
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Award,
      iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
      details: [
        prog.targetWeeks ? `Duration: ${prog.targetWeeks} Weeks` : null,
        prog.targetSessionsPerWeek ? `Frequency: ${prog.targetSessionsPerWeek}x Weekly` : null,
        prog.recoveryScore ? `Target Score: ${prog.recoveryScore}%` : null,
      ].filter(Boolean).join(' • '),
      notes: prog.description || 'Personalized clinical exercise and mobility protocol tailored for recovery.',
    });
  });

  // 4. Initial Intake Baseline
  if (patient) {
    const intakeDate = patient.profile?.createdAt || patient.createdAt || new Date(Date.now() - 7 * 86400000);
    items.push({
      id: 'patient_intake',
      type: 'INTAKE',
      title: `Patient Intake & Clinical Baseline Recorded`,
      date: new Date(intakeDate),
      dateStr: new Date(intakeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeStr: new Date(intakeDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      badge: 'INITIAL EVALUATION',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: History,
      iconColor: 'text-slate-600 bg-slate-100 border-slate-200',
      details: [
        `Primary Concern: ${patient.condition || 'Physical Rehabilitation Assessment'}`,
        `Baseline Recovery Score: ${patient.recoveryScore || 70}%`,
        `Assigned Attending Specialist: ${patient.therapist || 'Dr. Vivek Joshi'}`,
      ].join(' • '),
      notes: 'Initial clinical assessment and baseline vitals established in OneMedical registry.',
    });
  }

  // Sort chronological descending (latest first)
  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="card p-6 bg-white border border-slate-200 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <History size={16} className="text-blue-600" /> Clinical History & Session Milestones
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Chronological record of clinical consultations, rehabilitation programs, and exercise sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200/80">
            {items.length} Recorded Milestones
          </span>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.id || i} className="relative group">
                <div className={`absolute -left-[35px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center ${item.iconColor} shadow-2xs group-hover:scale-110 transition-transform`}>
                  <Icon size={12} />
                </div>
                <div className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 transition-all shadow-2xs">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.title}</h4>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {item.dateStr} • {item.timeStr}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  {item.details && (
                    <div className="text-xs text-slate-700 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 inline-block">
                      {item.details}
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
          No clinical history or session milestones recorded yet.
        </div>
      )}
    </div>
  );
}
