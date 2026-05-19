import { Router } from 'express';
import { login, register, me, devSeed, devNormalizeEmails } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validationRules } from '../middleware/validation.js';

const router = Router();

router.post('/register', authLimiter, validationRules.register, register);
router.post('/login', authLimiter, validationRules.login, login);
router.get('/me', authenticate, me);
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-seed', devSeed);
  router.get('/dev-seed', devSeed);
  router.post('/dev-normalize-emails', devNormalizeEmails);
}

export default router;




