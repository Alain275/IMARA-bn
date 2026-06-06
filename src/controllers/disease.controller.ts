import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const detectDisease = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mock disease detection - replace with ML model
    const result = {
      disease: 'Maize Leaf Blight',
      confidence: 94,
      severity: 'high',
      treatment: 'Apply fungicide (Mancozeb) at 2.5kg/ha',
      prevention: 'Crop rotation, proper spacing'
    };

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getDetectionHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const history = [
      { id: 1, disease: 'Maize Leaf Blight', date: '2024-03-15', confidence: 94 },
      { id: 2, disease: 'Bean Rust', date: '2024-03-10', confidence: 87 }
    ];

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

export const getDiseaseDatabase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const diseases = [
      { id: 1, name: 'Maize Streak Virus', crop: 'Maize', symptoms: 'Yellow streaks' },
      { id: 2, name: 'Bean Rust', crop: 'Beans', symptoms: 'Orange pustules' }
    ];

    res.json({ success: true, data: diseases });
  } catch (error) {
    next(error);
  }
};

export const getDiseaseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const disease = {
      id: req.params.id,
      name: 'Maize Leaf Blight',
      crop: 'Maize',
      symptoms: 'Gray-green lesions on leaves',
      treatment: 'Apply fungicide',
      prevention: 'Use resistant varieties'
    };

    res.json({ success: true, data: disease });
  } catch (error) {
    next(error);
  }
};
