import { Router } from 'express';
import {
  getCurrentWeather,
  getHourlyForecast,
  getDailyForecast,
  getFarmingAlerts,
  getRainfallHistory
} from '../controllers/weather.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/current', getCurrentWeather);
router.get('/hourly', getHourlyForecast);
router.get('/daily', getDailyForecast);
router.get('/alerts', getFarmingAlerts);
router.get('/rainfall', getRainfallHistory);

export default router;
