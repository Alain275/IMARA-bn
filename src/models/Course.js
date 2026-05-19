import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    trainerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    categories: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    level: { type: String, enum: ['beginner','intermediate','advanced'], default: 'beginner' },
    url: { type: String },
    coverImage: { type: String }, // ✅ Added for course cover image
    contentHtml: { type: String }  // ✅ Added for course detailed content
  },
  { timestamps: true }
);

export const Course = mongoose.model('Course', courseSchema);

