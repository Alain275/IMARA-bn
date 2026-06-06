import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import User, { UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const protectRoute = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Get token from header
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access this resource', 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

  // Check if user still exists
  const user = await User.findByPk(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists', 401));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated', 403));
  }

  // Attach user to request
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  next();
});
