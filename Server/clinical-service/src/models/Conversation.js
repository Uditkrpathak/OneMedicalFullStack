import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    participants: [
      {
        type: String,
        required: true,
      },
    ],
    participantDetails: [
      {
        userId: { type: String, required: true },
        name: { type: String, default: '' },
        role: { type: String, enum: ['patient', 'therapist', 'clinic_admin', 'super_admin'], default: 'patient' },
        avatar: { type: String, default: '' },
        phone: { type: String, default: '' },
      },
    ],
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    lastMessage: {
      text: { type: String, default: '' },
      senderId: { type: String, default: '' },
      senderRole: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
      hasAttachments: { type: Boolean, default: false },
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'closed'],
      default: 'active',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ appointmentId: 1 });
ConversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.model('Conversation', ConversationSchema);
export default Conversation;
