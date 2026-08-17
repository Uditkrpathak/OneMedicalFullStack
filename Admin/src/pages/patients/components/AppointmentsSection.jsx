import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Plus, RefreshCw, Eye } from 'lucide-react';

export default function AppointmentsSection({ appointments, patientId }) {
  const navigate = useNavigate();
  const list = appointments || [];

  return (
    <div className="card p-6 bg-white border border-slate-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" /> Patient Appointments
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Scheduled, completed and cancelled consultations</p>
        </div>

        <button
          onClick={() => navigate(patientId ? `/appointments/create?patientId=${patientId}` : '/appointments/create')}
          className="btn btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={13} /> Book Appointment
        </button>
      </div>

      {list.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="tbl w-full text-xs">
            <thead>
              <tr>
                <th>DATE & TIME</th>
                <th>SERVICE TYPE</th>
                <th>SPECIALIST</th>
                <th>LOCATION / MODE</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {list.map(a => (
                <tr key={a._id} className="hover:bg-slate-50">
                  <td className="font-bold text-slate-800">
                    <div>{new Date(a.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {new Date(a.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue text-[10px]">{a.serviceType?.replace(/_/g, ' ') || 'Consultation'}</span>
                  </td>
                  <td className="font-semibold text-slate-700">{a.therapistName || 'Specialist'}</td>
                  <td>
                    <span className="text-slate-600 flex items-center gap-1">
                      <MapPin size={11} className="text-slate-400" /> {a.appointmentPlace || 'Clinic'}
                    </span>
                  </td>
                  <td>
                    <span className={
                      a.status === 'CONFIRMED' || a.status === 'confirmed' ? 'badge badge-green text-[10px]' :
                      a.status === 'COMPLETED' || a.status === 'completed' ? 'badge badge-blue text-[10px]' :
                      'badge badge-slate text-[10px]'
                    }>
                      ● {a.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => navigate(`/appointments/${a._id}`)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
          No appointments recorded for this patient.
        </div>
      )}
    </div>
  );
}
