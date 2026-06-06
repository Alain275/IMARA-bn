import { Router } from 'express';
import { 
  detectDisease, 
  getDetectionHistory,
  getDiseaseDatabase,
  getDiseaseById
} from '../controllers/disease.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/detect', detectDisease);
router.get('/history', getDetectionHistory);
router.get('/database', getDiseaseDatabase);
router.get('/:id', getDiseaseById);

export default router;
