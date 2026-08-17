import { useState } from 'react';
import { FileText, Plus, User, Clock, Check } from 'lucide-react';

export default function ClinicalNotesSection({ notes, onAddNote, submitting }) {
  const [newNote, setNewNote] = useState('');
  const list = notes || [];

  const handleSave = e => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote);
    setNewNote('');
  };

  return (
    <div className="card p-6 bg-white border border-slate-200 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <FileText size={16} className="text-blue-600" /> Clinical Notes & Observations
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Specialist notes, subjective evaluations and observations</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <label className="text-xs font-bold text-slate-700">Add Clinical Entry</label>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Type observation note regarding range of motion, symptoms, or treatment modifications..."
          className="input text-xs h-20 resize-none bg-white"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !newNote.trim()}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={13} /> {submitting ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {list.length > 0 ? (
          list.map((n, i) => (
            <div key={n._id || i} className="p-4 bg-white rounded-xl border border-slate-100 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User size={13} className="text-blue-600" /> {n.author || n.userName || 'Specialist'}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock size={11} /> {new Date(n.createdAt || n.date).toLocaleDateString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{n.text || n.note || n.action}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic text-center py-4">No clinical notes recorded yet.</p>
        )}
      </div>
    </div>
  );
}
