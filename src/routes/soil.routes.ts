import { Router } from 'express';
import {
  getSoilTests,
  getLatestSoilTest,
  getSoilTestById,
  createSoilTest,
  updateSoilTest,
  deleteSoilTest,
  getSoilAnalysis
} from '../controllers/soil.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getSoilTests);
router.get('/latest', getLatestSoilTest);
router.get('/analysis', getSoilAnalysis);
router.get('/:id', getSoilTestById);
router.post('/', createSoilTest);
router.patch('/:id', updateSoilTest);
router.delete('/:id', deleteSoilTest);

export default router;
