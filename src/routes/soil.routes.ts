import { Router } from 'express';
import { 
  getSoilAnalysis,
  getCropSuitability,
  getRecommendations,
  submitSoilTest
} from '../controllers/soil.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/analysis', getSoilAnalysis);
router.get('/suitability', getCropSuitability);
router.get('/recommendations', getRecommendations);
router.post('/test', submitSoilTest);

export default router;
