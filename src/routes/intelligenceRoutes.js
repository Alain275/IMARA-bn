import { Router } from 'express';
import { greenhouseSummary } from '../controllers/intelligenceController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireDeviceAccess } from '../middleware/deviceAccess.js';

const router = Router();

router.get(
  '/greenhouse/summary',
  authenticate,
  requireDeviceAccess({ queryKey: 'deviceId', defaultDeviceId: 'greenhouse_01' }),
  greenhouseSummary,
);

export default router;

