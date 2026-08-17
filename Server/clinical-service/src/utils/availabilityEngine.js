import TherapistSchedule from '../models/TherapistSchedule.js';
import Appointment from '../models/Appointment.js';

export const DEFAULT_WEEKLY_WORKING_HOURS = [
  { dayOfWeek: 0, isWorking: false, startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 }, // Sunday off
  { dayOfWeek: 1, isWorking: true,  startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 }, // Monday
  { dayOfWeek: 2, isWorking: true,  startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 }, // Tuesday
  { dayOfWeek: 3, isWorking: true,  startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 }, // Wednesday
  { dayOfWeek: 4, isWorking: true,  startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 }, // Thursday
  { dayOfWeek: 5, isWorking: true,  startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 }, // Friday
  { dayOfWeek: 6, isWorking: true,  startTime: '09:00', endTime: '18:00', slotDurationMinutes: 30 }, // Saturday
];

/**
 * Calculates available consultation slots for a therapist on a given date.
 */
export const calculateTherapistAvailableSlots = async (therapistId, targetDateStr) => {
  if (!therapistId || !targetDateStr) return { availableSlots: [], isWorkingDay: false, isLeaveDay: false };

  const targetDate = new Date(targetDateStr);
  const dayOfWeek = targetDate.getUTCDay(); // 0-6
  const dateOnlyStr = targetDate.toISOString().slice(0, 10);

  // 1. Fetch or initialize schedule
  let schedule = await TherapistSchedule.findOne({ therapistId: therapistId.toString(), isActive: true }).lean();
  const weeklyHours = (schedule?.weeklyWorkingHours && schedule.weeklyWorkingHours.length > 0)
    ? schedule.weeklyWorkingHours
    : DEFAULT_WEEKLY_WORKING_HOURS;

  const slotDuration = schedule?.slotDurationMinutes || 30;
  const buffer = schedule?.appointmentBufferMinutes !== undefined ? schedule.appointmentBufferMinutes : 10;

  // 2. Check Leave Exceptions
  const leaves = schedule?.leaveExceptions || [];
  const activeLeave = leaves.find(l => {
    const lDateStr = new Date(l.date).toISOString().slice(0, 10);
    return lDateStr === dateOnlyStr;
  });

  if (activeLeave && activeLeave.isFullDay) {
    return {
      therapistId,
      date: dateOnlyStr,
      isWorkingDay: true,
      isLeaveDay: true,
      leaveReason: activeLeave.reason || 'On Leave',
      availableSlots: [],
      totalSlots: 0,
      bookedSlots: 0
    };
  }

  // 3. Check Day of Week Working Status
  const dayConfig = weeklyHours.find(d => d.dayOfWeek === dayOfWeek);
  if (!dayConfig || !dayConfig.isWorking) {
    return {
      therapistId,
      date: dateOnlyStr,
      isWorkingDay: false,
      isLeaveDay: false,
      availableSlots: [],
      totalSlots: 0,
      bookedSlots: 0
    };
  }

  // 4. Generate All Theoretical Slots
  const startTime = dayConfig.startTime || '09:00';
  const endTime = dayConfig.endTime || '18:00';
  const daySlotDuration = dayConfig.slotDurationMinutes || slotDuration;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const theoreticalSlots = [];
  let current = startMinutes;

  while (current + daySlotDuration <= endMinutes) {
    const slotStartH = Math.floor(current / 60).toString().padStart(2, '0');
    const slotStartM = (current % 60).toString().padStart(2, '0');
    const slotEndMin = current + daySlotDuration;
    const slotEndH = Math.floor(slotEndMin / 60).toString().padStart(2, '0');
    const slotEndM = (slotEndMin % 60).toString().padStart(2, '0');

    theoreticalSlots.push({
      startTime: `${slotStartH}:${slotStartM}`,
      endTime: `${slotEndH}:${slotEndM}`,
      time: `${slotStartH}:${slotStartM}`
    });

    current += daySlotDuration + buffer;
  }

  // 5. Query Confirmed / Held Appointments
  const startOfDay = new Date(`${dateOnlyStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateOnlyStr}T23:59:59.999Z`);

  const existingAppointments = await Appointment.find({
    therapistId: therapistId.toString(),
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['CONFIRMED', 'HELD', 'SCHEDULED', 'IN_PROGRESS', 'confirmed', 'held', 'scheduled', 'in_progress'] },
    isDeleted: false
  }).select('appointmentTime time startTime status').lean();

  const bookedTimeSet = new Set(existingAppointments.map(a => a.appointmentTime || a.time || a.startTime));
  const partialLeaveSlots = new Set(activeLeave?.affectedSlots || []);

  // 6. Filter Available Slots
  const availableSlots = theoreticalSlots.filter(s => !bookedTimeSet.has(s.startTime) && !partialLeaveSlots.has(s.startTime));

  return {
    therapistId,
    date: dateOnlyStr,
    isWorkingDay: true,
    isLeaveDay: false,
    slotDurationMinutes: daySlotDuration,
    appointmentBufferMinutes: buffer,
    totalSlots: theoreticalSlots.length,
    bookedSlots: bookedTimeSet.size,
    availableSlots
  };
};
