import { Router } from 'express';
import {
  register,
  verifyEmail,
  verifyEmailByToken,
  resendOTP,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
} from '../controllers/authController';
import { protectRoute } from '../middleware/protectRoute';

const router = Router();

// Public routes
router.post('/register', register);
router.get('/verify-email/:token', verifyEmailByToken); // Link-based verification
router.post('/verify-email', verifyEmail);              // OTP-based (legacy)
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/me', protectRoute, getMe);

export default router;
