import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema(
  {
    clientMsgId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ['patient', 'therapist', 'clinic_admin', 'super_admin', 'system'],
      required: true,
    },
    recipientId: {
      type: String,
      index: true,
    },
    text: {
      type: String,
      default: '',
    },
    attachments: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'pdf', 'document', 'prescription'], default: 'image' },
        name: { type: String, default: '' },
        size: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    readBy: [
      {
        userId: { type: String, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
ChatMessageSchema.index({ conversationId: 1, _id: -1 });

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);
export default ChatMessage;
