import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Filter, Heart, Play, Download, MoreVertical, Sparkles, CheckCircle,
  AlertCircle, RefreshCw, Dumbbell, Trash2
} from 'lucide-react';
import { api } from '../../api/api.js';
import { Spinner, EmptyState } from '../../components/ui.jsx';

export default function ExercisesPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listExercises(token, { search: searchQuery });
      const list = res?.data || [];
      setExercises(list.map(ex => ({
        _id: ex._id,
        name: ex.name || 'Exercise Item',
        bodyPart: ex.targetMuscle || ex.bodyPart || 'Full Body',
        difficulty: ex.difficulty || 'Beginner',
        duration: ex.duration ? `${ex.duration} mins` : '10 mins',
        thumb: ex.videoThumbnail || ex.thumb || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300',
        videoUrl: ex.videoUrl,
        setsReps: ex.sets ? `${ex.sets} sets × ${ex.reps || 10} reps` : null,
      })));
    } catch (err) {
      console.error('Failed to load exercises:', err);
      setError(err.message || 'Failed to load exercise library.');
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this exercise from library?')) return;
    try {
      await api.deleteExercise(token, id);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete exercise.');
    }
  };

  const bodyParts = ['All', ...Array.from(new Set(exercises.map(e => e.bodyPart).filter(Boolean)))];

  const filteredExercises = exercises.filter(ex => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || ex.name.toLowerCase().includes(q) || ex.bodyPart.toLowerCase().includes(q);
    const matchPart = selectedBodyPart === 'All' || ex.bodyPart === selectedBodyPart;
    return matchSearch && matchPart;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Exercise Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive database of therapeutic exercises with demonstration videos.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button className="btn btn-primary text-xs flex items-center gap-1.5" onClick={() => navigate('/exercises/create')}>
            <Plus size={15} /> Create Exercise
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search exercises by name or targeted body part..."
            className="input pl-9 text-xs py-2 w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={selectedBodyPart}
          onChange={e => setSelectedBodyPart(e.target.value)}
          className="select text-xs py-2 sm:w-48"
        >
          {bodyParts.map(bp => (
            <option key={bp} value={bp}>{bp === 'All' ? 'All Body Regions' : bp}</option>
          ))}
        </select>
      </div>

      {/* 4-State Container */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="card p-8 text-center space-y-3 border-red-200 bg-red-50/50">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800">Failed to Load Exercises</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={load} className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filteredExercises.length === 0 ? (
        <EmptyState
          title="No exercises found"
          subtitle={searchQuery ? 'No exercises match your search query.' : 'There are currently no exercises registered in the clinic library.'}
          actionLabel="Create First Exercise"
          onAction={() => navigate('/exercises/create')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredExercises.map(ex => (
            <div key={ex._id} className="card overflow-hidden cursor-pointer card-hover bg-white border border-slate-200">
              <div className="relative h-44 bg-slate-900 overflow-hidden group">
                <img
                  src={ex.thumb}
                  alt={ex.name}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-300"
                />
                <button className="absolute inset-0 flex items-center justify-center text-white text-3xl group-hover:scale-110 transition-transform">
                  ▶
                </button>
                <button
                  onClick={e => handleDelete(ex._id, e)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-600 text-white rounded-lg transition-colors"
                  title="Delete exercise"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge badge-blue text-[10px] uppercase font-bold">{ex.bodyPart}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{ex.difficulty}</span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 truncate">{ex.name}</h3>
                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span>⏱ {ex.duration}</span>
                  {ex.setsReps && <span className="font-semibold text-slate-600">{ex.setsReps}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
