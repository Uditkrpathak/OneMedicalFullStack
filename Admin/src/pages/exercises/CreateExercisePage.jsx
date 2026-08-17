import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, Save, AlertCircle, CheckCircle2, Dumbbell, Play, Video
} from 'lucide-react';
import { api } from '../../api/api.js';

export default function CreateExercisePage() {
  const navigate = useNavigate();
  const token = useSelector(s => s.auth?.accessToken);

  const [name, setName] = useState('');
  const [targetMuscle, setTargetMuscle] = useState('Knee');
  const [duration, setDuration] = useState('10');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [instructions, setInstructions] = useState('');
  const [precautions, setPrecautions] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter an exercise name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        targetMuscle,
        bodyPart: targetMuscle,
        difficulty,
        duration: Number(duration) || 10,
        instructions: instructions || 'Perform repetitions steadily under clinical control.',
        precautions: precautions || undefined,
        sets: Number(sets) || 3,
        reps: Number(reps) || 10,
        videoUrl: videoUrl || undefined,
        videoThumbnail: thumbnailUrl || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300',
      };

      await api.createExercise(token, payload);
      navigate('/exercises');
    } catch (err) {
      console.error('Failed to create exercise:', err);
      setError(err.message || 'Failed to save exercise.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-up max-w-[1000px] space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate('/exercises')} className="btn btn-secondary btn-sm text-xs">
            <ArrowLeft size={14} /> Exercise Library
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-700">New Exercise</span>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="card p-6 bg-white border border-slate-200 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Create Clinical Exercise</h2>
          <p className="text-xs text-slate-500 mt-0.5">Define therapeutic movements and protocols for rehabilitation programs.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="label">Exercise Title *</label>
            <input
              className="input text-xs"
              placeholder="e.g., Isometric Quadriceps Contraction"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Targeted Body Region</label>
            <select
              className="select text-xs w-full"
              value={targetMuscle}
              onChange={e => setTargetMuscle(e.target.value)}
            >
              <option value="Knee">Knee</option>
              <option value="Lower Back">Lower Back</option>
              <option value="Shoulder">Shoulder</option>
              <option value="Cervical Spine">Cervical Spine</option>
              <option value="Ankle & Foot">Ankle & Foot</option>
              <option value="Hip">Hip</option>
              <option value="Core">Core</option>
            </select>
          </div>

          <div>
            <label className="label">Difficulty Tier</label>
            <select
              className="select text-xs w-full"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
            >
              <option value="Beginner">Beginner (Phase 1)</option>
              <option value="Intermediate">Intermediate (Phase 2)</option>
              <option value="Advanced">Advanced (Phase 3)</option>
            </select>
          </div>

          <div>
            <label className="label">Prescribed Sets</label>
            <input
              type="number"
              className="input text-xs"
              value={sets}
              onChange={e => setSets(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Prescribed Repetitions / Hold</label>
            <input
              type="number"
              className="input text-xs"
              value={reps}
              onChange={e => setReps(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Estimated Duration (Minutes)</label>
            <input
              type="number"
              className="input text-xs"
              value={duration}
              onChange={e => setDuration(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Video Stream / Demo URL (Optional)</label>
            <input
              className="input text-xs"
              placeholder="https://..."
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Execution Instructions</label>
            <textarea
              className="input text-xs h-24 resize-none"
              placeholder="Step-by-step biomechanical execution instructions..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Clinical Precautions & Contraindications</label>
            <textarea
              className="input text-xs h-20 resize-none"
              placeholder="Notes on pain spikes, compensation patterns, or restrictions..."
              value={precautions}
              onChange={e => setPrecautions(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button type="button" onClick={() => navigate('/exercises')} className="btn btn-secondary text-xs">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary text-xs flex items-center gap-1.5">
            <Save size={14} /> {submitting ? 'Saving...' : 'Save to Library'}
          </button>
        </div>
      </form>
    </div>
  );
}
