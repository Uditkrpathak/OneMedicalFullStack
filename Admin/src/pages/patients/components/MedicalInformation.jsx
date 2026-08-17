import { Heart, Activity, AlertCircle, Pill, Shield, Plus, Stethoscope } from 'lucide-react';

export default function MedicalInformation({ medicalInfo, patient }) {
  const vitals = medicalInfo?.vitalMetrics || {
    bloodType: patient?.profile?.bloodGroup || 'O+',
    height: patient?.profile?.height ? `${patient.profile.height} cm` : '—',
    weight: patient?.profile?.weight ? `${patient.profile.weight} kg` : '—',
    bmi: 'Normal',
  };

  const allergies = medicalInfo?.allergies || patient?.profile?.allergies || [];
  const medications = medicalInfo?.medications || patient?.profile?.medications || [];
  const diagnoses = medicalInfo?.primaryDiagnoses || [
    { title: patient?.condition || 'Primary Rehabilitation', date: 'Active Concern', status: 'CURRENT' },
  ];
  const surgicalHistory = medicalInfo?.surgicalHistory || [];

  return (
    <div className="space-y-6">
      {/* VITALS & METRICS */}
      <div className="card p-6 bg-white border border-slate-200 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Heart size={16} className="text-rose-500" /> Vital Statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Group</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">{vitals.bloodType}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Height</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">{vitals.height}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">{vitals.weight}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BMI Status</div>
            <div className="text-lg font-black text-emerald-600 mt-0.5">{vitals.bmi}</div>
          </div>
        </div>
      </div>

      {/* DIAGNOSES & CONDITIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Stethoscope size={16} className="text-blue-600" /> Primary Diagnoses
          </h3>
          <div className="space-y-3">
            {diagnoses.length > 0 ? (
              diagnoses.map((d, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{typeof d === 'string' ? d : d.title}</div>
                    {d.desc && <div className="text-[11px] text-slate-500 mt-0.5">{d.desc}</div>}
                  </div>
                  <span className="badge badge-blue text-[10px] font-bold">
                    {d.status || 'ACTIVE'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No primary diagnoses recorded.</p>
            )}
          </div>
        </div>

        {/* ALLERGIES & MEDICATIONS */}
        <div className="card p-6 bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" /> Documented Allergies
          </h3>
          <div className="space-y-2">
            {allergies.length > 0 ? (
              allergies.map((a, i) => (
                <div key={i} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs font-semibold text-amber-800 flex items-center justify-between">
                  <span>{typeof a === 'string' ? a : a.name}</span>
                  {a.severity && <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-100 rounded">{a.severity}</span>}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No documented allergies.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
