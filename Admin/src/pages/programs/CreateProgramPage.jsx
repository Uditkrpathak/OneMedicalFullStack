import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Plus, ChevronDown, Check, ShieldCheck, Users, FileText,
  Zap, Accessibility, Dumbbell, ArrowLeft, AlertCircle, Save,
  Clock, Sparkles, Activity, Trash2, Layers, CheckCircle
} from 'lucide-react';
import { api } from '../../api/api.js';

const TEMPLATES = [
  {
    key: 'blank',
    label: 'Blank Program',
    icon: '✚',
    color: 'bg-slate-100 text-slate-600',
    title: '',
    condition: 'General Rehabilitation',
    bodyArea: 'Full Body',
    difficulty: 'Intermediate',
    duration: 6,
    sessionsPerWeek: 3,
    description: '',
    exercises: [],
  },
  {
    key: 'lower',
    label: 'Lower Back',
    icon: '🦴',
    color: 'bg-blue-50 text-blue-700',
    title: 'Lumbar Spine & Core Stabilization Protocol',
    condition: 'Lower Back Pain',
    bodyArea: 'Spine & Back',
    difficulty: 'Beginner',
    duration: 6,
    sessionsPerWeek: 3,
    description: 'Evidence-based progressive protocol for lumbar decompression, transversus abdominis activation, and pelvic stability.',
    exercises: [
      { name: 'Pelvic Tilts & Deep Core Activation', sets: 3, reps: 12, holdSeconds: 10, category: 'Activation' },
      { name: 'Bird Dog Spine Stabilizers', sets: 3, reps: 10, holdSeconds: 5, category: 'Core & Balance' },
      { name: 'Glute Bridge with Squeeze', sets: 3, reps: 15, holdSeconds: 5, category: 'Strength' },
    ],
  },
  {
    key: 'acl',
    label: 'ACL Rehab',
    icon: '🦵',
    color: 'bg-indigo-50 text-indigo-700',
    title: 'Post ACL Reconstruction & Mobility Protocol',
    condition: 'ACL Tear',
    bodyArea: 'Knee & Leg',
    difficulty: 'Intermediate',
    duration: 8,
    sessionsPerWeek: 4,
    description: 'Post-operative phased rehabilitation focusing on quadriceps reactivation, extension restoration, and joint stability.',
    exercises: [
      { name: 'Isometric Quad Sets with Towel Roll', sets: 3, reps: 12, holdSeconds: 10, category: 'Strength' },
      { name: 'Heel Slides for Knee Flexion', sets: 3, reps: 10, holdSeconds: 5, category: 'Mobility' },
      { name: 'Straight Leg Raises (Lag-Free)', sets: 3, reps: 15, holdSeconds: 5, category: 'Activation' },
    ],
  },
  {
    key: 'shoulder',
    label: 'Shoulder',
    icon: '💪',
    color: 'bg-purple-50 text-purple-700',
    title: 'Rotator Cuff & Scapular Dyskinesis Protocol',
    condition: 'Rotator Cuff Tear',
    bodyArea: 'Shoulder & Arm',
    difficulty: 'Intermediate',
    duration: 8,
    sessionsPerWeek: 3,
    description: 'Strengthens rotator cuff stabilizers, improves glenohumeral range of motion, and corrects scapular rhythm.',
    exercises: [
      { name: 'Side-Lying External Rotations', sets: 3, reps: 12, holdSeconds: 5, category: 'Strength' },
      { name: 'Scapular Wall Slides', sets: 3, reps: 10, holdSeconds: 5, category: 'Mobility' },
      { name: 'Prone Y-T-W Raises', sets: 3, reps: 10, holdSeconds: 3, category: 'Core & Balance' },
    ],
  },
  {
    key: 'sports',
    label: 'Sports Injury',
    icon: '🏃',
    color: 'bg-emerald-50 text-emerald-700',
    title: 'Athletic Return-To-Play & Agility Protocol',
    condition: 'Sports Injury',
    bodyArea: 'Full Body',
    difficulty: 'Advanced',
    duration: 10,
    sessionsPerWeek: 4,
    description: 'Advanced sports functional rehabilitation emphasizing eccentric strength, plyometric absorption, and dynamic deceleration.',
    exercises: [
      { name: 'Single-Leg Balance & Reach', sets: 3, reps: 10, holdSeconds: 5, category: 'Balance' },
      { name: 'Eccentric Hamstring Slider Curls', sets: 3, reps: 10, holdSeconds: 4, category: 'Strength' },
      { name: 'Lateral Band Walks & Decel Drills', sets: 3, reps: 15, holdSeconds: 0, category: 'Agility' },
    ],
  },
  {
    key: 'post',
    label: 'Post Surgery',
    icon: '🏥',
    color: 'bg-rose-50 text-rose-700',
    title: 'Post-Surgical Joint Mobilization & Edema Protocol',
    condition: 'Post Surgery',
    bodyArea: 'Full Body',
    difficulty: 'Beginner',
    duration: 4,
    sessionsPerWeek: 3,
    description: 'Gentle early-phase recovery addressing lymphatic drainage, pain reduction, safe range-of-motion, and safe weight bearing.',
    exercises: [
      { name: 'Ankle Pumps & Circulation Drills', sets: 3, reps: 20, holdSeconds: 2, category: 'Mobility' },
      { name: 'Gentle Passive-Assisted ROM', sets: 3, reps: 10, holdSeconds: 5, category: 'Mobility' },
      { name: 'Isometric Contractions', sets: 3, reps: 10, holdSeconds: 5, category: 'Activation' },
    ],
  },
];

const CONDITIONS = [
  'ACL Tear', 'Lower Back Pain', 'Frozen Shoulder', 'Cervical Spondylosis',
  'Knee Osteoarthritis', 'Plantar Fasciitis', 'Rotator Cuff Tear', 'Sports Injury', 'Post Surgery', 'General Rehabilitation'
];

const BODY_AREAS = [
  'Spine & Back', 'Knee & Leg', 'Shoulder & Arm', 'Neck', 'Hip & Pelvis',
  'Ankle & Foot', 'Full Body',
];

export default function CreateProgramPage() {
  const token = useSelector(s => s.auth?.accessToken);
  const navigate = useNavigate();

  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [programName, setProgramName] = useState('');
  const [condition, setCondition] = useState('Lower Back Pain');
  const [bodyArea, setBodyArea] = useState('Spine & Back');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [duration, setDuration] = useState('6');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('3');
  const [description, setDescription] = useState('');
  const [exercisesList, setExercisesList] = useState([]);
  
  // New Exercise Form
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('3');
  const [newExReps, setNewExReps] = useState('10');
  const [newExHold, setNewExHold] = useState('10');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleApplyTemplate = (tmpl) => {
    setSelectedTemplate(tmpl.key);
    if (tmpl.key === 'blank') {
      setProgramName('');
      setCondition('General Rehabilitation');
      setBodyArea('Full Body');
      setDifficulty('Intermediate');
      setDuration('6');
      setSessionsPerWeek('3');
      setDescription('');
      setExercisesList([]);
    } else {
      setProgramName(tmpl.title);
      setCondition(tmpl.condition);
      setBodyArea(tmpl.bodyArea);
      setDifficulty(tmpl.difficulty);
      setDuration(String(tmpl.duration));
      setSessionsPerWeek(String(tmpl.sessionsPerWeek));
      setDescription(tmpl.description);
      setExercisesList(tmpl.exercises);
    }
  };

  const handleAddExercise = () => {
    if (!newExName.trim()) return;
    setExercisesList(prev => [
      ...prev,
      {
        name: newExName.trim(),
        sets: Number(newExSets) || 3,
        reps: Number(newExReps) || 10,
        holdSeconds: Number(newExHold) || 10,
        category: 'Strength',
      }
    ]);
    setNewExName('');
    setNewExSets('3');
    setNewExReps('10');
    setNewExHold('10');
  };

  const handleRemoveExercise = (index) => {
    setExercisesList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreate = async e => {
    e.preventDefault();
    const validationErrors = {};

    if (!programName.trim() || programName.trim().length < 3) {
      validationErrors.title = 'Program title is required (minimum 3 characters).';
    }
    const durNum = Number(duration);
    if (!durNum || durNum < 1 || durNum > 52) {
      validationErrors.duration = 'Duration must be between 1 and 52 weeks.';
    }
    const sessNum = Number(sessionsPerWeek);
    if (!sessNum || sessNum < 1 || sessNum > 7) {
      validationErrors.sessionsPerWeek = 'Target sessions must be between 1 and 7 days / week.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await api.createProgram(token, {
        title: programName.trim(),
        name: programName.trim(),
        description: description.trim() || 'Clinical exercise protocol tailored for progressive recovery.',
        targetCondition: condition,
        condition,
        bodyArea,
        difficulty: difficulty.toLowerCase(),
        durationWeeks: durNum,
        targetSessionsPerWeek: sessNum,
        exercises: exercisesList.map(e => ({
          name: e.name,
          sets: Number(e.sets) || 3,
          reps: Number(e.reps) || 10,
          holdSeconds: Number(e.holdSeconds) || 5,
        })),
        isTemplate: true,
        status: 'published',
      });
      navigate('/programs');
    } catch (err) {
      console.error('Failed to create program:', err);
      setErrors({ server: err.message || 'Failed to create program on server.' });
    } finally {
      setLoading(false);
    }
  };

  const totalSessionsCount = (Number(duration) || 6) * (Number(sessionsPerWeek) || 3);

  return (
    <div className="space-y-6 animate-fade-up text-slate-800 max-w-[1140px] mx-auto pb-16">
      
      {/* ── BREADCRUMB HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => navigate('/programs')}
            className="btn btn-secondary btn-sm text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={13} /> Programs
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-700">New Recovery Program</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Recovery Program</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Configure evidence-based protocols, target muscle parameters, and prescribe daily exercise routines.
        </p>
      </div>

      {errors.server && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <span className="font-medium">{errors.server}</span>
        </div>
      )}

      {/* ── MAIN BUILDER GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLS: PROGRAM CONFIGURATION */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            
            {/* 1. TEMPLATE PICKER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#003882]" /> Start From a Template
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Pre-fills parameters & exercises</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {TEMPLATES.map(t => {
                  const isSelected = selectedTemplate === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleApplyTemplate(t)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#003882] bg-blue-50/50 shadow-xs ring-2 ring-[#003882]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-2xs ${t.color}`}>
                        {t.icon}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 leading-tight">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* 2. PROGRAM DETAILS */}
            <div className="space-y-4 text-xs">
              <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-[#003882]" /> Foundational Details
              </h3>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Program Title *</span>
                  {errors.title && <span className="text-rose-600 font-semibold">{errors.title}</span>}
                </label>
                <input
                  value={programName}
                  onChange={e => {
                    setProgramName(e.target.value);
                    if (errors.title) setErrors(p => ({ ...p, title: null }));
                  }}
                  placeholder="e.g. Lumbar Core Stability Protocol"
                  className={`input text-xs ${errors.title ? 'border-rose-400 bg-rose-50/20' : ''}`}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Condition</label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    className="select text-xs w-full"
                  >
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Body Region</label>
                  <select
                    value={bodyArea}
                    onChange={e => setBodyArea(e.target.value)}
                    className="select text-xs w-full"
                  >
                    {BODY_AREAS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="select text-xs w-full"
                  >
                    <option value="Beginner">Beginner (Level 1)</option>
                    <option value="Intermediate">Intermediate (Level 2)</option>
                    <option value="Advanced">Advanced (Level 3)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Duration (Weeks) *</span>
                    {errors.duration && <span className="text-rose-600 font-semibold">{errors.duration}</span>}
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => {
                      setDuration(e.target.value);
                      if (errors.duration) setErrors(p => ({ ...p, duration: null }));
                    }}
                    className={`input text-xs ${errors.duration ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    min="1"
                    max="52"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Target Sessions / Week *</span>
                    {errors.sessionsPerWeek && <span className="text-rose-600 font-semibold">{errors.sessionsPerWeek}</span>}
                  </label>
                  <input
                    type="number"
                    value={sessionsPerWeek}
                    onChange={e => {
                      setSessionsPerWeek(e.target.value);
                      if (errors.sessionsPerWeek) setErrors(p => ({ ...p, sessionsPerWeek: null }));
                    }}
                    className={`input text-xs ${errors.sessionsPerWeek ? 'border-rose-400 bg-rose-50/20' : ''}`}
                    min="1"
                    max="7"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Target Sessions</label>
                  <div className="input text-xs bg-slate-50 font-bold text-[#003882] flex items-center">
                    {totalSessionsCount} prescribed sessions
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Description & Outcomes</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Overview of targeted rehabilitation outcomes, functional benchmarks, and precautions..."
                  className="input text-xs h-20 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* 3. PRESCRIBED EXERCISE BUILDER */}
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Dumbbell size={14} className="text-[#003882]" /> Prescribed Exercises ({exercisesList.length})
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">Included in daily workout routines</span>
              </div>

              {/* Added Exercises List */}
              {exercisesList.length > 0 ? (
                <div className="space-y-2">
                  {exercisesList.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#003882]/10 text-[#003882] flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{ex.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {ex.sets} Sets × {ex.reps} Reps {ex.holdSeconds > 0 ? `(${ex.holdSeconds}s hold)` : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Remove exercise"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium">
                  No exercises added yet. Use the fields below or select a template.
                </p>
              )}

              {/* Add Custom Exercise Bar */}
              <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
                <label className="block font-bold text-slate-700 text-[11px]">Quick Add Exercise</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      value={newExName}
                      onChange={e => setNewExName(e.target.value)}
                      placeholder="e.g. Quadriceps Isometric Hold"
                      className="input text-xs bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:col-span-2">
                    <input
                      type="number"
                      value={newExSets}
                      onChange={e => setNewExSets(e.target.value)}
                      placeholder="Sets"
                      className="input text-xs bg-white"
                      title="Sets"
                    />
                    <input
                      type="number"
                      value={newExReps}
                      onChange={e => setNewExReps(e.target.value)}
                      placeholder="Reps"
                      className="input text-xs bg-white"
                      title="Reps"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddExercise}
                    disabled={!newExName.trim()}
                    className="btn btn-secondary text-xs font-bold py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={13} /> Add to Program
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate('/programs')}
                className="btn btn-secondary text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary text-xs font-bold py-2.5 px-6 bg-[#003882] hover:bg-[#002b66] text-white rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save size={14} /> {loading ? 'Publishing Program...' : 'Publish Recovery Program'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COL: LIVE PROGRAM PREVIEW */}
        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-[#003882]" /> Mobile & Patient Preview
            </h3>

            {/* LIVE SIMULATED RECOVERY CARD */}
            <div className="bg-[#003D9B] text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden border border-blue-800">
              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

              {/* Week Badge */}
              <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-[11px] font-bold text-white">
                <Sparkles size={12} /> Week 1 of {duration || 6} • Active Protocol
              </div>

              {/* Title & Sub */}
              <div>
                <h4 className="text-lg font-black leading-snug">
                  {programName || 'Select a template or enter program title'}
                </h4>
                <p className="text-xs text-blue-200 mt-1 line-clamp-2">
                  {description || 'Comprehensive clinical exercise protocol tailored for functional rehabilitation.'}
                </p>
              </div>

              {/* Recovery Dial Gauge */}
              <div className="flex justify-center py-2">
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center p-2 border border-white/20">
                  <div className="w-full h-full rounded-full bg-white text-[#003D9B] flex flex-col items-center justify-center shadow-md">
                    <span className="text-xl font-black">0%</span>
                    <span className="text-[8px] font-black uppercase tracking-wider">RECOVERY</span>
                  </div>
                </div>
              </div>

              {/* Prescribed Stats Row */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-center">
                <div className="p-2 rounded-xl bg-white/10">
                  <p className="text-[10px] text-blue-200 uppercase font-bold">Total Sessions</p>
                  <p className="text-sm font-black text-white">{totalSessionsCount}</p>
                </div>
                <div className="p-2 rounded-xl bg-white/10">
                  <p className="text-[10px] text-blue-200 uppercase font-bold">Exercises</p>
                  <p className="text-sm font-black text-white">{exercisesList.length}</p>
                </div>
              </div>

              {/* Exercises Mini-Pills */}
              {exercisesList.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] uppercase font-bold text-blue-200">Prescribed Routine:</p>
                  {exercisesList.slice(0, 3).map((ex, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] bg-white/10 px-2.5 py-1.5 rounded-lg">
                      <span className="truncate flex-1 font-medium">{ex.name}</span>
                      <span className="text-blue-200 shrink-0 ml-2 font-mono text-[10px]">{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                  {exercisesList.length > 3 && (
                    <p className="text-[10px] text-blue-300 text-center font-bold">+{exercisesList.length - 3} more exercises</p>
                  )}
                </div>
              )}
            </div>

            {/* Protocol Meta Details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Target Condition:</span>
                <span className="font-bold text-slate-800">{condition}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Body Region:</span>
                <span className="font-bold text-slate-800">{bodyArea}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Difficulty Level:</span>
                <span className="badge font-bold bg-blue-50 text-blue-700 text-[10px]">{difficulty}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Weekly Cadence:</span>
                <span className="font-bold text-slate-800">{sessionsPerWeek} days / week</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
