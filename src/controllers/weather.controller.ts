import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';

// Get current weather
export const getCurrentWeather = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location = 'Kigali', lat, lon } = req.query;

    // Placeholder weather data - integrate with real API later
    const weather = {
      location: location || 'Kigali, Rwanda',
      temperature: 24,
      feelsLike: 26,
      humidity: 68,
      windSpeed: 12,
      windDirection: 'NE',
      uvIndex: 6,
      visibility: 10,
      pressure: 1013,
      condition: 'Partly Cloudy',
      conditionCode: 'partly_cloudy',
      sunrise: '06:15',
      sunset: '18:30',
      rainChance: 30,
      lastUpdated: new Date()
    };

    res.json({ success: true, data: weather });
  } catch (error) {
    next(error);
  }
};

// Get hourly forecast
export const getHourlyForecast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location = 'Kigali', hours = 12 } = req.query;

    // Placeholder forecast data
    const forecast = Array.from({ length: Number(hours) }, (_, i) => ({
      time: new Date(Date.now() + i * 3600000).toISOString(),
      temperature: 24 + Math.floor(Math.random() * 6),
      condition: ['sunny', 'cloudy', 'partly_cloudy', 'rainy'][Math.floor(Math.random() * 4)],
      rainChance: Math.floor(Math.random() * 100),
      windSpeed: 10 + Math.floor(Math.random() * 10),
      humidity: 60 + Math.floor(Math.random() * 20)
    }));

    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
};

// Get daily forecast
export const getDailyForecast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location = 'Kigali', days = 7 } = req.query;

    // Placeholder forecast data
    const daysArray = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const forecast = Array.from({ length: Number(days) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        day: daysArray[date.getDay()],
        tempHigh: 26 + Math.floor(Math.random() * 4),
        tempLow: 16 + Math.floor(Math.random() * 3),
        condition: ['sunny', 'cloudy', 'partly_cloudy', 'rainy'][Math.floor(Math.random() * 4)],
        rainChance: Math.floor(Math.random() * 100),
        humidity: 60 + Math.floor(Math.random() * 20),
        windSpeed: 10 + Math.floor(Math.random() * 10)
      };
    });

    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
};

// Get farming alerts
export const getFarmingAlerts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location = 'Kigali' } = req.query;

    // Placeholder alerts
    const alerts = [
      {
        id: '1',
        type: 'warning',
        priority: 'high',
        title: 'Heavy Rainfall Expected',
        message: 'Heavy rainfall expected tomorrow - Avoid fertilizer application',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 24 * 3600000),
        recommendations: ['Postpone spraying', 'Check drainage systems']
      },
      {
        id: '2',
        type: 'info',
        priority: 'medium',
        title: 'Good Planting Conditions',
        message: 'Good conditions for planting beans in the next 3 days',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 72 * 3600000),
        recommendations: ['Prepare seed beds', 'Check seed inventory']
      }
    ];

    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

// Get rainfall history
export const getRainfallHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location = 'Kigali', months = 12 } = req.query;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Placeholder data
    const history = Array.from({ length: Number(months) }, (_, i) => {
      const monthIndex = (new Date().getMonth() - Number(months) + i + 1 + 12) % 12;
      return {
        month: monthNames[monthIndex],
        rainfall: Math.floor(Math.random() * 150) + 20,
        average: Math.floor(Math.random() * 120) + 30,
        days: Math.floor(Math.random() * 15) + 5
      };
    });

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
