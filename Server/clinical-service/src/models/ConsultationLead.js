import mongoose from 'mongoose';

const ConsultationLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    therapistId: {
      type: String,
      index: true,
      default: null,
    },
    therapistName: {
      type: String,
      default: 'General Specialist',
    },
    serviceType: {
      type: String,
      default: 'INITIAL_ASSESSMENT',
    },
    appointmentPlace: {
      type: String,
      enum: ['VIDEO', 'CLINIC', 'HOME'],
      default: 'VIDEO',
    },
    preferredDate: {
      type: String,
      default: '',
    },
    preferredTime: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONTACTED', 'CONVERTED', 'CLOSED'],
      default: 'PENDING',
      index: true,
    },
    source: {
      type: String,
      default: 'LANDING_PAGE',
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    convertedAppointmentId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ConsultationLeadSchema.index({ createdAt: -1 });
ConsultationLeadSchema.index({ phone: 1, createdAt: -1 });

const ConsultationLead = mongoose.model('ConsultationLead', ConsultationLeadSchema);
export default ConsultationLead;
