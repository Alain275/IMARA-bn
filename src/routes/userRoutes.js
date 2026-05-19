import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getMe, updateMe, changePassword, sendWeeklyReport } from '../controllers/userController.js';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.post('/password', authenticate, changePassword);
router.post('/weekly-report', authenticate, sendWeeklyReport);

export default router;



