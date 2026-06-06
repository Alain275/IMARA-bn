import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getCurrentWeather = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const weather = {
      temperature: 24,
      humidity: 68,
      windSpeed: 12,
      condition: 'Partly Cloudy',
      location: 'Kigali'
    };

    res.json({ success: true, data: weather });
  } catch (error) {
    next(error);
  }
};

export const getHourlyForecast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const forecast = Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      temp: 20 + Math.random() * 10,
      rain: Math.random() * 100
    }));

    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
};

export const getWeeklyForecast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const forecast = Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      high: 25 + Math.random() * 5,
      low: 15 + Math.random() * 5,
      condition: 'Sunny'
    }));

    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
};

export const getFarmingAlerts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const alerts = [
      { type: 'warning', message: 'Heavy rainfall expected tomorrow', severity: 'high' },
      { type: 'info', message: 'Good planting conditions next week', severity: 'low' }
    ];

    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};
