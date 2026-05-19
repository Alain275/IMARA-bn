import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    studentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    progress: { type: Number, default: 0 }
  },
  { timestamps: true }
);

enrollmentSchema.index({ courseId: 1, studentUserId: 1 }, { unique: true });

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

