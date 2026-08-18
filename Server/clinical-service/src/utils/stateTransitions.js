export const APPOINTMENT_TRANSITIONS = {
  HELD: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CHECKED_IN', 'IN_PROGRESS', 'CANCELLED', 'RESCHEDULED', 'COMPLETED'],
  RESCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CHECKED_IN: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal lifecycle state (Attendance.outcome captures PROVIDER_NO_SHOW, PATIENT_NO_SHOW, etc.)
  CANCELLED: [], // Terminal
  EXPIRED: [],   // Terminal
};

export const ATTENDANCE_TRANSITIONS = {
  SCHEDULED: ['WAITING_FOR_THERAPIST', 'WAITING_FOR_PATIENT', 'SESSION_IN_PROGRESS', 'NO_ATTENDANCE', 'CANCELLED'],
  WAITING_FOR_THERAPIST: ['SESSION_IN_PROGRESS', 'PROVIDER_NO_SHOW', 'SESSION_COMPLETED', 'TECHNICAL_FAILURE'],
  WAITING_FOR_PATIENT: ['SESSION_IN_PROGRESS', 'PATIENT_NO_SHOW', 'SESSION_COMPLETED', 'TECHNICAL_FAILURE'],
  SESSION_IN_PROGRESS: ['SESSION_COMPLETED', 'TECHNICAL_FAILURE', 'PROVIDER_NO_SHOW'],
  SESSION_COMPLETED: [], // Terminal
  PROVIDER_NO_SHOW: [],  // Terminal (Patient protected from charge/no-show)
  PATIENT_NO_SHOW: [],   // Terminal
  NO_ATTENDANCE: [],     // Terminal
  TECHNICAL_FAILURE: [], // Terminal
};

/**
 * Validates whether transitioning from fromStatus to toStatus is legally permitted.
 * Throws an Error with descriptive code if invalid.
 */
export const assertAppointmentTransition = (fromStatus, toStatus, isAdminOverride = false) => {
  if (fromStatus === toStatus) return true;
  if (isAdminOverride) return true;

  const allowed = APPOINTMENT_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    const error = new Error(
      `Illegal appointment transition: cannot change state from '${fromStatus}' to '${toStatus}'. Allowed transitions: [${allowed.join(', ')}]`
    );
    error.statusCode = 400;
    error.code = 'ILLEGAL_STATE_TRANSITION';
    throw error;
  }
  return true;
};

/**
 * Validates attendance state transitions.
 */
export const assertAttendanceTransition = (fromOutcome, toOutcome, isAdminOverride = false) => {
  if (!fromOutcome || fromOutcome === toOutcome) return true;
  if (isAdminOverride) return true;

  const allowed = ATTENDANCE_TRANSITIONS[fromOutcome] || [];
  if (!allowed.includes(toOutcome)) {
    const error = new Error(
      `Illegal attendance transition: cannot change attendance outcome from '${fromOutcome}' to '${toOutcome}'. Allowed transitions: [${allowed.join(', ')}]`
    );
    error.statusCode = 400;
    error.code = 'ILLEGAL_ATTENDANCE_TRANSITION';
    throw error;
  }
  return true;
};
