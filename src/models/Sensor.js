import mongoose from 'mongoose';

const sensorSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    location: { type: String },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    authorizedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    greenhouseId: { type: String, index: true },
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', index: true },
    deviceToken: { type: String, index: true },
    status: { type: String, enum: ['active','inactive'], default: 'active', index: true },
    lastSeen: { type: Date },
    healthState: { type: String, enum: ['online', 'offline', 'stale'], default: 'offline', index: true },
    telemetryLatencyMs: { type: Number, default: null },
    lastStatusTransitionAt: { type: Date },
  },
  { timestamps: true }
);

// Compound indexes for common queries
sensorSchema.index({ ownerUserId: 1, status: 1 }); // User's active devices
sensorSchema.index({ status: 1, lastSeen: -1 }); // Find inactive devices
sensorSchema.index({ authorizedUserIds: 1, status: 1 });

export const Sensor = mongoose.model('Sensor', sensorSchema);


