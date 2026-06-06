import { Response, NextFunction } from 'express';
import { AuthRequest } from './protectRoute';
import { AppError } from '../utils/AppError';
import { UserRole } from '../models/User';

export const restrictTo = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
