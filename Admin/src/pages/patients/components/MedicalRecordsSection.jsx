import { FileText, Download, Upload, ExternalLink, ShieldCheck } from 'lucide-react';

export default function MedicalRecordsSection({ records, patientId, onUpload }) {
  const list = records || [];

  return (
    <div className="card p-6 bg-white border border-slate-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <FileText size={16} className="text-blue-600" /> Medical Documents & Scans
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">HIPAA-compliant document repository</p>
        </div>

        <button
          onClick={onUpload}
          className="btn btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Upload size={13} /> Upload Document
        </button>
      </div>

      {list.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map(r => (
            <div key={r._id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                  PDF
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{r.title || r.fileName || 'Medical Document'}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString('en-IN')} • {r.recordType || 'Diagnostic Report'}
                  </div>
                </div>
              </div>

              {r.fileUrl && (
                <a
                  href={r.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <Download size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
          No medical records uploaded for this patient.
        </div>
      )}
    </div>
  );
}
