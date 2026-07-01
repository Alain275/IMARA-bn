import { Router } from 'express';
import {
  createFarm,
  getFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
  getFarmStats
} from '../controllers/farm.controller';
import { protectRoute } from '../middleware/protectRoute';

const router = Router();

// All routes require authentication
router.use(protectRoute);

// Farm CRUD
router.post('/', createFarm);
router.get('/', getFarms);
router.get('/stats', getFarmStats);
router.get('/:id', getFarmById);
router.put('/:id', updateFarm);
router.delete('/:id', deleteFarm);

export default router;
