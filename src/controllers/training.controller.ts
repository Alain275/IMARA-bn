import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getAllCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courses = [
      { id: 1, title: 'Modern Maize Farming', duration: '2.5 hours', lessons: 12, enrolled: 1456, rating: 4.8 },
      { id: 2, title: 'Integrated Pest Management', duration: '3 hours', lessons: 15, enrolled: 892, rating: 4.7 }
    ];

    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

export const getCourseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const course = {
      id: req.params.id,
      title: 'Modern Maize Farming',
      description: 'Learn modern techniques',
      duration: '2.5 hours',
      lessons: 12,
      content: []
    };

    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const enrollCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const enrollment = {
      courseId: req.params.id,
      userId: req.user?.id,
      enrolledAt: new Date(),
      progress: 0
    };

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};

export const getUserProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const progress = [
      { courseId: 1, progress: 45, completed: false },
      { courseId: 2, progress: 100, completed: true }
    ];

    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

export const getAchievements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const achievements = [
      { title: 'First Course', earned: true },
      { title: 'Quick Learner', earned: true },
      { title: 'Expert Farmer', earned: false }
    ];

    res.json({ success: true, data: achievements });
  } catch (error) {
    next(error);
  }
};
