import { Router } from 'express';
import { 
  getCurrentWeather,
  getHourlyForecast,
  getWeeklyForecast,
  getFarmingAlerts
} from '../controllers/weather.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/current', getCurrentWeather);
router.get('/hourly', getHourlyForecast);
router.get('/weekly', getWeeklyForecast);
router.get('/alerts', getFarmingAlerts);

export default router;
