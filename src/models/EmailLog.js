import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    html: { type: String },
    category: {
      type: String,
      enum: ['system', 'marketing', 'alerts', 'account', 'ai_notifications', 'newsletters'],
      default: 'system',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'queued', 'sent', 'failed'],
      default: 'sent',
      index: true,
    },
    opened: { type: Boolean, default: false },
    clicked: { type: Boolean, default: false },
    failedReason: { type: String },
    senderAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    providerMessageId: { type: String },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    /** e.g. welcome_signup, login, plant_diagnosis, device_added */
    trigger: { type: String, index: true },
    templateKey: { type: String, index: true },
  },
  { timestamps: true },
);

emailLogSchema.index({ createdAt: -1, status: 1 });
emailLogSchema.index({ category: 1, createdAt: -1 });

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);

