import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Mock data - replace with actual logic
    const recommendations = [
      { id: 1, name: 'Maize', suitability: 92, season: 'A', reason: 'High soil pH match' },
      { id: 2, name: 'Beans', suitability: 88, season: 'A', reason: 'Good rainfall conditions' },
      { id: 3, name: 'Irish Potatoes', suitability: 85, season: 'B', reason: 'Cool temperature optimal' },
    ];

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCrops = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const crops = [
      { id: 1, name: 'Maize', category: 'Cereals', growthPeriod: '90-120 days' },
      { id: 2, name: 'Beans', category: 'Legumes', growthPeriod: '60-90 days' },
      { id: 3, name: 'Rice', category: 'Cereals', growthPeriod: '120-150 days' },
    ];

    res.json({
      success: true,
      data: crops
    });
  } catch (error) {
    next(error);
  }
};

export const getCropById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
    const crop = {
      id,
      name: 'Maize',
      category: 'Cereals',
      growthPeriod: '90-120 days',
      waterNeed: 'Medium',
      description: 'Major staple crop in Rwanda'
    };

    res.json({
      success: true,
      data: crop
    });
  } catch (error) {
    next(error);
  }
};

export const getPlantingCalendar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const calendar = [
      { crop: 'Maize', months: [3, 4, 9, 10], seasons: ['A', 'B'] },
      { crop: 'Beans', months: [2, 3, 9, 10], seasons: ['A', 'B'] },
    ];

    res.json({
      success: true,
      data: calendar
    });
  } catch (error) {
    next(error);
  }
};

export const getFertilizerRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const recommendations = [
      { crop: 'Maize', nitrogen: '120 kg/ha', phosphorus: '60 kg/ha', potassium: '40 kg/ha' },
      { crop: 'Beans', nitrogen: '20 kg/ha', phosphorus: '40 kg/ha', potassium: '20 kg/ha' },
    ];

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};
