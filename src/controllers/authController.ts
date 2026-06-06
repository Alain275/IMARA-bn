import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';
import emailService from '../services/emailService';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [farmer, agronomist, admin, cooperative]
 *               location:
 *                 type: string
 *               farmSize:
 *                 type: number
 *     responses:
 *       201:
 *         description: User registered successfully, OTP sent
 */
export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, phone, role, location, farmSize } = req.body;

  // Validate role
  if (!Object.values(UserRole).includes(role)) {
    return next(new AppError('Invalid user role', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    location,
    farmSize,
    isEmailVerified: false,
    isActive: true,
  });

  // Generate email verification token (24h link)
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  // Send verification link email
  try {
    await emailService.sendVerificationEmail(user, verificationToken);
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }

  const verifyURL = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/verify-email/${verificationToken}`;

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email and click the verification link to activate your account.',
    data: {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      // Included for easy testing — remove in production
      verificationToken,
      verifyURL,
    },
  });
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email with OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
/**
 * Verify email via token link (GET /api/auth/verify-email/:token)
 */
export const verifyEmailByToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.params;

  // Hash the token to compare against stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({ where: { emailVerificationToken: hashedToken } });

  if (!user || !user.emailVerificationExpires || new Date() > user.emailVerificationExpires) {
    return next(new AppError('Verification link is invalid or has expired', 400));
  }

  if (user.isEmailVerified) {
    return next(new AppError('Email already verified', 400));
  }

  // Mark as verified and clear token
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

  // Generate tokens and redirect (or return JSON for API clients)
  const authToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Redirect to frontend with tokens
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  return res.redirect(`${frontendURL}/email-verified?token=${authToken}&refreshToken=${refreshToken}`);
});

/**
 * @deprecated Use verifyEmailByToken (link-based) instead
 */
export const verifyEmail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, otp } = req.body;

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if already verified
  if (user.isEmailVerified) {
    return next(new AppError('Email already verified', 400));
  }

  // Verify OTP
  if (!user.verifyOTP(otp)) {
    return next(new AppError('Invalid or expired OTP', 400));
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.clearOTP();
  await user.save();

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

  // Generate tokens
  const token = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  res.json({
    success: true,
    message: 'Email verified successfully',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        farmSize: user.farmSize,
        isEmailVerified: user.isEmailVerified,
      },
      token,
      refreshToken,
    },
  });
});

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend OTP for email verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 */
export const resendOTP = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.isEmailVerified) {
    return next(new AppError('Email already verified', 400));
  }

  // Generate new OTP
  const otp = user.generateOTP();
  await user.save();

  // Send OTP
  await emailService.sendOTP(user, otp);

  res.json({
    success: true,
    message: 'OTP resent successfully',
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    return next(new AppError('Please verify your email before logging in', 403));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated', 403));
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const token = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        farmSize: user.farmSize,
        isEmailVerified: user.isEmailVerified,
      },
      token,
      refreshToken,
    },
  });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
export const getMe = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findByPk(req.user!.id, {
    attributes: { exclude: ['password', 'otp', 'emailVerificationToken', 'passwordResetToken'] },
  });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    success: true,
    data: user,
  });
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
export const forgotPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError('No user found with that email', 404));
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save();

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user, resetToken);

    res.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return next(new AppError('Failed to send password reset email', 500));
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
export const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { token, password } = req.body;

  // Hash token to compare
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken,
    },
  });

  if (!user || !user.passwordResetExpires || new Date() > user.passwordResetExpires) {
    return next(new AppError('Invalid or expired reset token', 400));
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Generate new tokens
  const authToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  res.json({
    success: true,
    message: 'Password reset successful',
    data: {
      token: authToken,
      refreshToken,
    },
  });
});

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
export const refreshToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token required', 400));
  }

  // Verify refresh token
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

  // Find user
  const user = await User.findByPk(decoded.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Generate new tokens
  const newToken = user.generateAuthToken();
  const newRefreshToken = user.generateRefreshToken();

  res.json({
    success: true,
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
    },
  });
});
