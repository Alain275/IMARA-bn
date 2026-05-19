import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
    type: { type: String, default: 'system', index: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

adminNotificationSchema.index({ createdAt: -1, priority: 1 });

export const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

