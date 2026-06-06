import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = {
      id: req.user?.id,
      name: 'Jean Mugabo',
      email: req.user?.email,
      phone: '+250 788 123 456',
      location: 'Gasabo District, Kigali',
      role: 'farmer'
    };

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, location } = req.body;

    const updated = {
      id: req.user?.id,
      name,
      phone,
      location,
      updatedAt: new Date()
    };

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = req.body;

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = {
      coursesInProgress: 3,
      coursesCompleted: 7,
      totalLearningTime: 18,
      certificatesEarned: 2
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
