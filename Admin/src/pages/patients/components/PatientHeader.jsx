import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, User, Activity, Edit, Plus, AlertTriangle, Trash2 } from 'lucide-react';

export default function PatientHeader({
  patient,
  onEditProfile,
  onAddNote,
  onAssignProgram,
  onFlagPatient,
  onDeletePatient,
}) {
  const navigate = useNavigate();

  if (!patient) return null;

  const { name, ageGender, phone, email, id, status, recoveryScore, therapist } = patient;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patients')}
          className="btn btn-ghost btn-sm text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to Patients
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onFlagPatient}
            className="btn btn-secondary text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
          >
            <AlertTriangle size={13} /> Flag Concern
          </button>
          <button onClick={onAddNote} className="btn btn-secondary text-xs">
            <Plus size={13} /> Add Clinical Note
          </button>
          <button onClick={onAssignProgram} className="btn btn-secondary text-xs">
            Assign Program
          </button>
          <button onClick={onEditProfile} className="btn btn-secondary text-xs">
            <Edit size={13} /> Edit Profile
          </button>
          <button
            onClick={onDeletePatient}
            className="btn btn-secondary text-xs text-red-600 bg-red-50 hover:bg-red-100 border-red-200 flex items-center gap-1.5"
          >
            <Trash2 size={13} /> Deactivate
          </button>
        </div>
      </div>

      <div className="card p-6 bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 font-black text-xl flex items-center justify-center border-2 border-blue-200 shrink-0">
            {patient.avatar ? (
              <img src={patient.avatar} alt={name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              name?.[0] || 'P'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900">{name}</h1>
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                #{id}
              </span>
              <span className={status === 'Active Treatment' ? 'badge badge-blue text-[10px]' : 'badge badge-slate text-[10px]'}>
                ● {status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
              <span>{ageGender}</span>
              <span className="flex items-center gap-1"><Phone size={12} /> {phone}</span>
              <span className="flex items-center gap-1"><Mail size={12} /> {email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Specialist</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">{therapist || 'Not Assigned'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recovery Score</div>
            <div className="text-lg font-black text-blue-600 mt-0.5">{recoveryScore}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
