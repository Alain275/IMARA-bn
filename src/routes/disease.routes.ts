import { Router } from 'express';
import {
  getDiseaseDetections,
  getDiseaseById,
  createDiseaseDetection,
  updateDiseaseDetection,
  deleteDiseaseDetection,
  getDiseaseStats,
  detectDiseaseFromImage
} from '../controllers/disease.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getDiseaseDetections);
router.get('/stats', getDiseaseStats);
router.get('/:id', getDiseaseById);
router.post('/', createDiseaseDetection);
router.post('/detect', detectDiseaseFromImage);
router.patch('/:id', updateDiseaseDetection);
router.delete('/:id', deleteDiseaseDetection);

export default router;
