import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getSoilAnalysis = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analysis = {
      ph: 6.2,
      nitrogen: 45,
      phosphorus: 38,
      potassium: 62,
      organicMatter: 4.2,
      texture: 'Clay Loam',
      overallHealth: 78
    };

    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
};

export const getCropSuitability = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const suitability = [
      { crop: 'Maize', suitability: 92, status: 'excellent' },
      { crop: 'Beans', suitability: 88, status: 'excellent' },
      { crop: 'Rice', suitability: 45, status: 'fair' }
    ];

    res.json({ success: true, data: suitability });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const recommendations = [
      { type: 'action', title: 'Add Nitrogen Fertilizer', priority: 'high' },
      { type: 'info', title: 'pH Level Optimal', priority: 'low' }
    ];

    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
};

export const submitSoilTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ph, nitrogen, phosphorus, potassium } = req.body;

    const result = {
      id: Date.now(),
      ph,
      nitrogen,
      phosphorus,
      potassium,
      submittedAt: new Date()
    };

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
