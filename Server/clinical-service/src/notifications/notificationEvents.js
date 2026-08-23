/**
 * Central Event Catalog & Notification Policies for OneMedical
 */
export const EVENT_TYPES = {
  // Auth
  AUTH_OTP_GENERATED: 'auth.otp_generated',
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  AUTH_NEW_LOGIN: 'auth.new_login',

  // Appointment
  APPOINTMENT_REQUESTED: 'appointment.booking_requested',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_REJECTED: 'appointment.rejected',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_REMINDER_24H: 'appointment.reminder_24h',
  APPOINTMENT_REMINDER_1H: 'appointment.reminder_1h',
  APPOINTMENT_REMINDER_STARTING: 'appointment.reminder_starting',
  APPOINTMENT_THERAPIST_LATE: 'appointment.therapist_late',
  APPOINTMENT_PROVIDER_NO_SHOW: 'appointment.provider_no_show',
  APPOINTMENT_PATIENT_NO_SHOW: 'appointment.patient_no_show',
  APPOINTMENT_NO_ATTENDANCE: 'appointment.no_attendance',
  APPOINTMENT_TECHNICAL_FAILURE: 'appointment.technical_failure',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  REVIEW_PROMPT: 'appointment.review_prompt',

  // Telehealth
  TELEHEALTH_CALL_STARTING: 'telehealth.call_starting',
  TELEHEALTH_CALL_MISSED: 'telehealth.call_missed',
  TELEHEALTH_CALL_ENDED: 'telehealth.call_ended',

  // Chat
  CHAT_MESSAGE_RECEIVED: 'chat.message_received',
  CHAT_MESSAGE_MISSED: 'chat.message_missed',

  // Clinical
  CLINICAL_PAIN_SUBMITTED: 'clinical.pain_submitted',
  CLINICAL_HIGH_PAIN_ALERT: 'clinical.high_pain_alert',
  CLINICAL_EXERCISE_ASSIGNED: 'clinical.exercise_assigned',
  CLINICAL_EXERCISE_COMPLETED: 'clinical.exercise_completed',
  CLINICAL_RECOVERY_MILESTONE: 'clinical.recovery_milestone',
  CLINICAL_TREATMENT_PLAN_UPDATED: 'clinical.treatment_plan_updated',
  CLINICAL_NOTE_ADDED: 'clinical.note_added',
  CLINICAL_CONSULTATION_STARTED: 'clinical.consultation_started',
  CLINICAL_CONSULTATION_SUBMITTED: 'clinical.consultation_submitted',
  CLINICAL_CONSULTATION_SEALED: 'clinical.consultation_sealed',
  CLINICAL_CONSULTATION_AMENDED: 'clinical.consultation_amended',

  // Medical Records Vault
  MEDICAL_RECORD_UPLOADED: 'medical_record.uploaded',
  MEDICAL_RECORD_VERIFIED: 'medical_record.verified',
  MEDICAL_RECORD_REPORT_GENERATED: 'medical_record.report_generated',
  MEDICAL_RECORD_ADDED_TO_VAULT: 'medical_record.added_to_vault',

  // Payment
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_DUE: 'payment.due',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_INVOICE_GENERATED: 'payment.invoice_generated',

  // System & Admin
  ADMIN_NEW_PATIENT: 'admin.new_patient',
  ADMIN_CRITICAL_ALERT: 'admin.critical_alert',
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_DEGRADATION: 'system.degradation',
};

/**
 * Channel routing rules and priority definition per event and role
 */
export const EVENT_POLICIES = {
  [EVENT_TYPES.AUTH_OTP_GENERATED]: {
    type: 'auth',
    priority: 'high',
    channels: {
      patient: { inApp: false, push: false, email: true, sms: true },
      therapist: { inApp: false, push: false, email: true, sms: true },
    },
    retentionDays: 7,
  },
  [EVENT_TYPES.AUTH_PASSWORD_CHANGED]: {
    type: 'auth',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: true, push: true, email: true, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.AUTH_NEW_LOGIN]: {
    type: 'auth',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: true, push: true, email: true, sms: false },
    },
    retentionDays: 90,
  },

  // Appointment Events
  [EVENT_TYPES.APPOINTMENT_REQUESTED]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: true, push: true, email: true, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.APPOINTMENT_CONFIRMED]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: true, push: true, email: true, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.APPOINTMENT_REJECTED]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.APPOINTMENT_RESCHEDULED]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: true },
      therapist: { inApp: true, push: true, email: true, sms: true },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.APPOINTMENT_CANCELLED]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: true },
      therapist: { inApp: true, push: true, email: true, sms: true },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.APPOINTMENT_REMINDER_24H]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: true },
      therapist: { inApp: true, push: true, email: true, sms: false },
    },
    retentionDays: 30,
  },
  [EVENT_TYPES.APPOINTMENT_REMINDER_1H]: {
    type: 'appointment',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: true },
      therapist: { inApp: true, push: true, email: false, sms: false },
    },
    retentionDays: 30,
  },
  [EVENT_TYPES.APPOINTMENT_REMINDER_STARTING]: {
    type: 'appointment',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: true },
      therapist: { inApp: true, push: true, email: false, sms: true },
    },
    retentionDays: 14,
  },
  [EVENT_TYPES.APPOINTMENT_THERAPIST_LATE]: {
    type: 'appointment',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: true },
    },
    retentionDays: 30,
  },
  [EVENT_TYPES.APPOINTMENT_PROVIDER_NO_SHOW]: {
    type: 'appointment',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: true },
      therapist: { inApp: true, push: true, email: true, sms: false },
      clinic_admin: { inApp: true, push: true, email: true, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.APPOINTMENT_PATIENT_NO_SHOW]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: true, push: true, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 60,
  },
  [EVENT_TYPES.APPOINTMENT_NO_ATTENDANCE]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: false, email: true, sms: false },
      therapist: { inApp: true, push: false, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 60,
  },
  [EVENT_TYPES.APPOINTMENT_TECHNICAL_FAILURE]: {
    type: 'appointment',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: true, push: true, email: true, sms: false },
      clinic_admin: { inApp: true, push: true, email: true, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.APPOINTMENT_COMPLETED]: {
    type: 'appointment',
    priority: 'low',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 60,
  },
  [EVENT_TYPES.REVIEW_PROMPT]: {
    type: 'appointment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: false, push: false, email: false, sms: false },
    },
    retentionDays: 60,
  },

  // Telehealth
  [EVENT_TYPES.TELEHEALTH_CALL_STARTING]: {
    type: 'telehealth',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: true, email: false, sms: false },
    },
    retentionDays: 14,
  },
  [EVENT_TYPES.TELEHEALTH_CALL_MISSED]: {
    type: 'telehealth',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: true, email: false, sms: false },
    },
    retentionDays: 30,
  },
  [EVENT_TYPES.TELEHEALTH_CALL_ENDED]: {
    type: 'telehealth',
    priority: 'low',
    channels: {
      patient: { inApp: true, push: false, email: false, sms: false },
      therapist: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 30,
  },

  // Chat
  [EVENT_TYPES.CHAT_MESSAGE_RECEIVED]: {
    type: 'chat',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: true, email: false, sms: false },
    },
    aggregate: true,
    aggregateWindowSec: 60,
    retentionDays: 30,
  },
  [EVENT_TYPES.CHAT_MESSAGE_MISSED]: {
    type: 'chat',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: true, push: true, email: true, sms: false },
    },
    retentionDays: 30,
  },

  // Clinical
  [EVENT_TYPES.CLINICAL_PAIN_SUBMITTED]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      therapist: { inApp: true, push: true, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.CLINICAL_HIGH_PAIN_ALERT]: {
    type: 'clinical',
    priority: 'critical', // Critical bypass: ignores quiet hours & category disable
    channels: {
      therapist: { inApp: true, push: true, email: true, sms: true },
      clinic_admin: { inApp: true, push: true, email: true, sms: false },
    },
    retentionDays: 365,
  },
  [EVENT_TYPES.CLINICAL_EXERCISE_ASSIGNED]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 60,
  },
  [EVENT_TYPES.CLINICAL_EXERCISE_COMPLETED]: {
    type: 'clinical',
    priority: 'low',
    channels: {
      therapist: { inApp: true, push: true, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 60,
  },
  [EVENT_TYPES.CLINICAL_RECOVERY_MILESTONE]: {
    type: 'clinical',
    priority: 'low',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.CLINICAL_TREATMENT_PLAN_UPDATED]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: true, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.CLINICAL_NOTE_ADDED]: {
    type: 'clinical',
    priority: 'low',
    channels: {
      therapist: { inApp: true, push: false, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.CLINICAL_CONSULTATION_STARTED]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.CLINICAL_CONSULTATION_SUBMITTED]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.CLINICAL_CONSULTATION_SEALED]: {
    type: 'clinical',
    priority: 'low',
    channels: {
      therapist: { inApp: true, push: false, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 365,
  },
  [EVENT_TYPES.CLINICAL_CONSULTATION_AMENDED]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      therapist: { inApp: true, push: false, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 365,
  },
  [EVENT_TYPES.MEDICAL_RECORD_UPLOADED]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      therapist: { inApp: true, push: true, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.MEDICAL_RECORD_VERIFIED]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.MEDICAL_RECORD_REPORT_GENERATED]: {
    type: 'clinical',
    priority: 'low',
    channels: {
      therapist: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.MEDICAL_RECORD_ADDED_TO_VAULT]: {
    type: 'clinical',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
    },
    retentionDays: 365,
  },

  // Payment
  [EVENT_TYPES.PAYMENT_INITIATED]: {
    type: 'payment',
    priority: 'low',
    channels: {
      patient: { inApp: true, push: false, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 60,
  },
  [EVENT_TYPES.PAYMENT_DUE]: {
    type: 'payment',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: true },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.PAYMENT_SUCCEEDED]: {
    type: 'payment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 180,
  },
  [EVENT_TYPES.PAYMENT_FAILED]: {
    type: 'payment',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: true },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.PAYMENT_REFUNDED]: {
    type: 'payment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: true, email: true, sms: true },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 180,
  },
  [EVENT_TYPES.PAYMENT_INVOICE_GENERATED]: {
    type: 'payment',
    priority: 'normal',
    channels: {
      patient: { inApp: true, push: false, email: true, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 180,
  },

  // System & Admin
  [EVENT_TYPES.ADMIN_NEW_PATIENT]: {
    type: 'admin',
    priority: 'low',
    channels: {
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
      super_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 90,
  },
  [EVENT_TYPES.ADMIN_CRITICAL_ALERT]: {
    type: 'admin',
    priority: 'critical',
    channels: {
      clinic_admin: { inApp: true, push: true, email: true, sms: true },
      super_admin: { inApp: true, push: true, email: true, sms: true },
    },
    retentionDays: 365,
  },
  [EVENT_TYPES.SYSTEM_MAINTENANCE]: {
    type: 'system',
    priority: 'high',
    channels: {
      patient: { inApp: true, push: true, email: false, sms: false },
      therapist: { inApp: true, push: true, email: false, sms: false },
      clinic_admin: { inApp: true, push: false, email: false, sms: false },
    },
    retentionDays: 30,
  },
  [EVENT_TYPES.SYSTEM_DEGRADATION]: {
    type: 'system',
    priority: 'high',
    channels: {
      clinic_admin: { inApp: true, push: true, email: true, sms: true },
      super_admin: { inApp: true, push: true, email: true, sms: true },
    },
    retentionDays: 90,
  },
};
