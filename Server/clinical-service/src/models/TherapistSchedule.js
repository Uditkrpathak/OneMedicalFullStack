import mongoose from 'mongoose';

const WorkingDaySchema = new mongoose.Schema({
  dayOfWeek:           { type: Number, min: 0, max: 6, required: true }, // 0=Sun ... 6=Sat
  isWorking:           { type: Boolean, default: true },
  startTime:           { type: String, default: '09:00' }, // "09:00"
  endTime:             { type: String, default: '18:00' },   // "18:00"
  slotDurationMinutes: { type: Number, default: 30 },
}, { _id: false });

const LeaveExceptionSchema = new mongoose.Schema({
  date:          { type: Date, required: true },
  reason:        { type: String, trim: true },
  isFullDay:     { type: Boolean, default: true },
  affectedSlots: [{ type: String }],
  createdAt:     { type: Date, default: Date.now },
});

const TherapistScheduleSchema = new mongoose.Schema({
  therapistId:              { type: String, required: true, unique: true, index: true },
  weeklyWorkingHours:       { type: [WorkingDaySchema], default: [] },
  appointmentBufferMinutes: { type: Number, default: 10 },
  slotDurationMinutes:      { type: Number, default: 30 },
  leaveExceptions:          { type: [LeaveExceptionSchema], default: [] },
  isActive:                 { type: Boolean, default: true },
  timezone:                 { type: String, default: 'Asia/Kolkata' },
}, { timestamps: true });

const TherapistSchedule = mongoose.model('TherapistSchedule', TherapistScheduleSchema);
export default TherapistSchedule;
