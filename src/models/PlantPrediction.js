import mongoose from 'mongoose';

const plantPredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String },
  imageFilename: { type: String },
  cropType: { type: String },
  label: { type: String, required: true },
  confidence: { type: Number, required: true },
  status: { type: String, default: 'completed' }, // completed | failed | queued | processing
  latencyMs: { type: Number },
  recommendations: { type: mongoose.Schema.Types.Mixed }, // Kept for backward compatibility
  diseaseInfo: { type: mongoose.Schema.Types.Mixed }, // Full disease information from knowledge base
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: false,
});

plantPredictionSchema.index({ createdAt: -1 });
plantPredictionSchema.index({ label: 1, createdAt: -1 });
plantPredictionSchema.index({ userId: 1, createdAt: -1 });

export const PlantPrediction = mongoose.model('PlantPrediction', plantPredictionSchema);
