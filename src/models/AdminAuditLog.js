import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, index: true },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

adminAuditLogSchema.index({ createdAt: -1, action: 1 });

export const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);

