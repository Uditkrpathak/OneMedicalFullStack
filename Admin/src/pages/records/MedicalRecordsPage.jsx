import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Upload, Search, Filter, ShieldCheck, Folder, Eye, Lock,
  AlertCircle, RefreshCw, Trash2, X, CheckCircle2, User, File
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';

export default function MedicalRecordsPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('All');

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    patientId: '',
    recordType: 'MRI_SCAN',
    notes: '',
    fileUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToastMsg = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, patRes] = await Promise.allSettled([
        api.listMedicalRecords(token, { search: searchQuery }),
        api.listPatients(token, { limit: 100 }),
      ]);

      if (recRes.status === 'fulfilled' && recRes.value?.data) {
        setRecords(recRes.value.data);
      } else if (recRes.status === 'rejected') {
        throw new Error(recRes.reason?.message || 'Failed to load medical records.');
      }

      if (patRes.status === 'fulfilled' && patRes.value?.data) {
        setPatients(patRes.value.data);
        if (patRes.value.data.length > 0 && !uploadForm.patientId) {
          setUploadForm(p => ({ ...p, patientId: patRes.value.data[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to load medical records:', err);
      setError(err.message || 'Failed to connect to HIPAA document repository.');
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUploadSubmit = async e => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.patientId) {
      alert('Title and patient selection are required.');
      return;
    }
    setUploading(true);
    try {
      await api.createMedicalRecord(token, {
        title: uploadForm.title,
        patientId: uploadForm.patientId,
        recordType: uploadForm.recordType,
        notes: uploadForm.notes,
        fileUrl: uploadForm.fileUrl || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
      });
      showToastMsg('Document uploaded and encrypted successfully!');
      setShowUploadModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this medical record?')) return;
    try {
      await api.deleteMedicalRecord(token, id);
      showToastMsg('Record removed from vault.');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (r.title || '').toLowerCase().includes(q) || (r.patientName || '').toLowerCase().includes(q);
    const matchType = recordTypeFilter === 'All' || r.recordType === recordTypeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 animate-fade-up text-slate-800">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Medical Records & Document Repository</h1>
          <p className="text-xs text-slate-500 mt-0.5">HIPAA-compliant secure repository for patient MRI scans, reports, and lab documents.</p>
        </div>
        <button
          className="btn btn-primary text-xs shrink-0 self-start sm:self-auto flex items-center gap-1.5"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload size={14} /> Upload Document
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="card p-4 bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by title or patient name..."
            className="input pl-9 text-xs py-2 w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={recordTypeFilter}
          onChange={e => setRecordTypeFilter(e.target.value)}
          className="select text-xs py-2 sm:w-48"
        >
          <option value="All">All Document Types</option>
          <option value="MRI_SCAN">MRI & X-Ray Scans</option>
          <option value="DISCHARGE_SUMMARY">Discharge Summaries</option>
          <option value="PRESCRIPTION">Prescriptions</option>
          <option value="LAB_REPORT">Lab Reports</option>
        </select>
      </div>

      {/* ── 4-STATE CONTAINER ── */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Medical Documents</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={loadData} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="No medical documents found"
          subtitle={searchQuery ? 'No documents matched your search filter.' : 'The HIPAA document repository is currently empty.'}
          actionLabel="Upload First Document"
          onAction={() => setShowUploadModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map(r => (
            <div key={r._id} className="card p-5 bg-white border border-slate-200 space-y-3 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 font-black text-xs flex items-center justify-center">
                  PDF
                </div>
                <button
                  onClick={e => handleDelete(r._id, e)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                  title="Delete record"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 truncate">{r.title || 'Diagnostic Document'}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{r.recordType?.replace(/_/g, ' ') || 'Medical File'}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(r.createdAt || r.date).toLocaleDateString('en-IN')}</span>
                {r.fileUrl && (
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                  >
                    <Download size={13} /> View / Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-up text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Upload Medical Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  className="input text-xs"
                  placeholder="e.g., Left Knee MRI Scan"
                  value={uploadForm.title}
                  onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
                <select
                  value={uploadForm.patientId}
                  onChange={e => setUploadForm(p => ({ ...p, patientId: e.target.value }))}
                  className="select w-full text-xs"
                  required
                >
                  <option value="">Choose Patient...</option>
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.phoneNumber || 'Patient'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Category</label>
                <select
                  value={uploadForm.recordType}
                  onChange={e => setUploadForm(p => ({ ...p, recordType: e.target.value }))}
                  className="select w-full text-xs"
                >
                  <option value="MRI_SCAN">MRI & Imaging Scan</option>
                  <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="LAB_REPORT">Lab Report</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Notes (Optional)</label>
                <textarea
                  className="input text-xs h-16 resize-none"
                  placeholder="Diagnostic notes..."
                  value={uploadForm.notes}
                  onChange={e => setUploadForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn btn-primary text-xs flex items-center gap-1.5">
                  <Upload size={13} /> {uploading ? 'Encrypting & Storing...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
