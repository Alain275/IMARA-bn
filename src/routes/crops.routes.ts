import { Router } from 'express';
import { 
  getRecommendations, 
  getAllCrops, 
  getCropById,
  getPlantingCalendar,
  getFertilizerRecommendations
} from '../controllers/crops.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All crop routes require authentication
router.use(authMiddleware);

router.get('/recommendations', getRecommendations);
router.get('/calendar', getPlantingCalendar);
router.get('/fertilizer', getFertilizerRecommendations);
router.get('/', getAllCrops);
router.get('/:id', getCropById);

export default router;
