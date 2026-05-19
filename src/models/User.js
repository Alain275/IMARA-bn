import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true, index: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, index: true, sparse: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'farmer', 'student', 'trainer'], default: 'farmer' },
    avatarUrl: { type: String },
    profile: {
      gender: { type: String, enum: ['male','female','other'], default: undefined },
      dob: { type: Date },
      extraPhone: { type: String },
      address: {
        province: String,
        district: String,
        sector: String,
        cell: String,
        village: String,
      },
      completedPercentage: { type: Number, default: 0 }
    },
    farmInfo: {
      farmName: String,
      farmSize: String, // legacy free-text
      farmSizeValue: { type: Number },
      farmSizeUnit: { type: String, enum: ['m2','ha','acre'], default: undefined },
      farmType: String, // legacy free-text
      type: { type: String, enum: ['Vegetables','Beans','Maize','Fruits','Rice','Coffee','Tea','Cassava','Potatoes','Mixed','Other'], default: undefined }
    },
    devices: [{ type: String }]
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);




