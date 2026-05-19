import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    temperature: { type: Number },
    humidity: { type: Number },
    soilMoisture: { type: Number },
    lightIntensity: { type: Number },
    waterLevel: { type: Number },
    mode: { type: String, enum: ['AUTO', 'MANUAL'] },
    pumpStatus: { type: String, enum: ['ON','OFF'], index: false },
    valve: { type: Boolean },
    bulb: { type: Boolean },
    fan: { type: Boolean },
    heater: { type: Boolean },
    buzzer: { type: Boolean },
    status: { type: String },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Compound indexes for common queries
sensorDataSchema.index({ deviceId: 1, timestamp: -1 }); // Most recent data per device
sensorDataSchema.index({ deviceId: 1, createdAt: -1 }); // Query by creation time
sensorDataSchema.index({ timestamp: 1 }); // Time-based queries for cleanup
sensorDataSchema.index({ deviceId: 1, soilMoisture: 1, timestamp: -1 }); // Irrigation analysis

// TTL index for automatic data cleanup (optional - keep 90 days)
// Uncomment to enable automatic deletion of old data
// sensorDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SensorData = mongoose.model('SensorData', sensorDataSchema);




