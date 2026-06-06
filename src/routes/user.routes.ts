import { Router } from 'express';
import { 
  getProfile,
  updateProfile,
  updateSettings,
  getStats
} from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/settings', updateSettings);
router.get('/stats', getStats);

export default router;
