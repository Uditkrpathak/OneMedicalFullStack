import mongoose from 'mongoose';
import Exercise from '../models/Exercise.js';

// ─── CREATE EXERCISE ──────────────────────────────────────────────────────────
export const createExercise = async (req, res) => {
  try {
    const therapistId = req.headers['x-user-id'];
    const { name, description, bodyPart, difficulty, mediaUrl, thumbnailUrl, instructions, mistakesToAvoid, defaultSets, defaultReps, defaultDurationSec, isPublic } = req.body;

    if (!name || !bodyPart) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name and bodyPart are required.' } });

    const exercise = await Exercise.create({ name, description, bodyPart, difficulty, mediaUrl, thumbnailUrl, instructions, mistakesToAvoid, defaultSets, defaultReps, defaultDurationSec, isPublic: isPublic || false, createdBy: therapistId });
    res.status(201).json({ success: true, data: { exercise } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── LIST EXERCISES ───────────────────────────────────────────────────────────
export const listExercises = async (req, res) => {
  try {
    const therapistId = req.headers['x-user-id'];
    const { bodyPart, difficulty, page = 1, limit = 20, search } = req.query;

    // Therapists see their own + all public exercises
    const filter = { isDeleted: false, $or: [{ createdBy: therapistId }, { isPublic: true }] };
    if (bodyPart)   filter.bodyPart  = new RegExp(bodyPart, 'i');
    if (difficulty) filter.difficulty = difficulty;
    if (search)     filter.name = new RegExp(search, 'i');

    let total = await Exercise.countDocuments({ isDeleted: false });
    if (total === 0) {
      const defaultExercises = [
        {
          name: 'Isometric Quad Sets',
          bodyPart: 'Knee',
          category: 'strengthening',
          difficulty: 'beginner',
          defaultSets: 3,
          defaultReps: 10,
          defaultDurationSec: 30,
          isPublic: true,
          instructions: ['Sit with leg straight.', 'Tighten thigh muscle pushing back of knee into the bed.'],
        },
        {
          name: 'Straight Leg Raise',
          bodyPart: 'Knee & Hip',
          category: 'strengthening',
          difficulty: 'beginner',
          defaultSets: 3,
          defaultReps: 12,
          defaultDurationSec: 30,
          isPublic: true,
          instructions: ['Lie on back, bend one knee.', 'Keep other leg straight and lift 12 inches off floor.'],
        },
        {
          name: 'Heel Slides with Towel',
          bodyPart: 'Knee',
          category: 'mobility',
          difficulty: 'beginner',
          defaultSets: 3,
          defaultReps: 10,
          defaultDurationSec: 30,
          isPublic: true,
          instructions: ['Lie on back and gently slide heel toward buttocks using towel for assistance.'],
        },
        {
          name: 'Hamstring Curl & Stretch',
          bodyPart: 'Hamstrings',
          category: 'stretching',
          difficulty: 'beginner',
          defaultSets: 3,
          defaultReps: 10,
          defaultDurationSec: 30,
          isPublic: true,
          instructions: ['Stand holding chair for balance.', 'Bend knee bringing heel toward buttocks smoothly.'],
        },
        {
          name: 'Ankle Pumps & Mobilization',
          bodyPart: 'Ankle',
          category: 'mobility',
          difficulty: 'beginner',
          defaultSets: 3,
          defaultReps: 15,
          defaultDurationSec: 20,
          isPublic: true,
          instructions: ['Point toes down and pull toes up in smooth continuous rhythm.'],
        }
      ];
      await Exercise.insertMany(defaultExercises);
      total = await Exercise.countDocuments({ isDeleted: false });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const exercises = await Exercise.find(filter).skip(skip).limit(parseInt(limit)).lean();

    res.json({ success: true, data: exercises, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET EXERCISE BY ID ───────────────────────────────────────────────────────
export const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    let exercise = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      exercise = await Exercise.findById(id).lean();
    }
    if (!exercise) {
      // Fallback: try finding by name/code or first active exercise
      exercise = await Exercise.findOne({ isDeleted: false }).lean();
    }
    if (!exercise || exercise.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exercise not found.' } });
    }
    res.json({ success: true, data: exercise, exercise });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── UPDATE EXERCISE ──────────────────────────────────────────────────────────
export const updateExercise = async (req, res) => {
  try {
    const therapistId = req.headers['x-user-id'];
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise || exercise.isDeleted) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exercise not found.' } });
    if (exercise.createdBy !== therapistId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own exercises.' } });

    const allowed = ['name', 'description', 'bodyPart', 'difficulty', 'mediaUrl', 'thumbnailUrl', 'instructions', 'mistakesToAvoid', 'defaultSets', 'defaultReps', 'defaultDurationSec', 'isPublic'];
    allowed.forEach(key => { if (req.body[key] !== undefined) exercise[key] = req.body[key]; });
    await exercise.save();
    res.json({ success: true, data: { exercise } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── DELETE EXERCISE ──────────────────────────────────────────────────────────
export const deleteExercise = async (req, res) => {
  try {
    const therapistId = req.headers['x-user-id'];
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise || exercise.isDeleted) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exercise not found.' } });
    if (exercise.createdBy !== therapistId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own exercises.' } });
    exercise.isDeleted = true;
    await exercise.save();
    res.json({ success: true, data: { message: 'Exercise deleted.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
