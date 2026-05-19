import mongoose from 'mongoose';

const deviceRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },
    sector: { type: String },
    cell: { type: String },
    village: { type: String },
    farmSize: { type: String },
    devices: { type: [String], required: true },
    message: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'contacted', 'approved', 'rejected', 'completed'], 
      default: 'pending' 
    },
    adminNotes: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const DeviceRequest = mongoose.model('DeviceRequest', deviceRequestSchema);
