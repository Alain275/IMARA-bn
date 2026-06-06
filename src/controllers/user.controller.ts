import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User, { UserRole } from '../models/User';
import bcrypt from 'bcryptjs';

// Profile Management
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByPk(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, location, farmSize } = req.body;

    const user = await User.findByPk(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update only provided fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (farmSize !== undefined) user.farmSize = farmSize;

    await user.save();

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: user 
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters' 
      });
    }

    const user = await User.findByPk(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required to delete account' 
      });
    }

    const user = await User.findByPk(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Password is incorrect' 
      });
    }

    // Soft delete by deactivating
    user.isActive = false;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
};

// User Management (Admin)
export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check admin role
    if (req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const { role, isActive, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where[Symbol.for('or')] = [
        { name: { [Symbol.for('iLike')]: `%${search}%` } },
        { email: { [Symbol.for('iLike')]: `%${search}%` } }
      ];
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if user is admin or requesting own profile
    if (req.user!.role !== UserRole.ADMIN && req.user!.id !== id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check admin role
    if (req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, phone, location, farmSize, role, isActive, isEmailVerified } = req.body;

    // Update only provided fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (farmSize !== undefined) user.farmSize = farmSize;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;

    await user.save();

    res.json({ 
      success: true, 
      message: 'User updated successfully',
      data: user 
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check admin role
    if (req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user!.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }

    await user.destroy();

    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
};

// Farmers-specific APIs
export const getAllFarmers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location, minFarmSize, maxFarmSize, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { role: UserRole.FARMER, isActive: true };
    
    if (location) where.location = { [Symbol.for('iLike')]: `%${location}%` };
    if (minFarmSize) where.farmSize = { ...where.farmSize, [Symbol.for('gte')]: Number(minFarmSize) };
    if (maxFarmSize) where.farmSize = { ...where.farmSize, [Symbol.for('lte')]: Number(maxFarmSize) };

    const { rows: farmers, count } = await User.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        farmers,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmerStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const farmerId = req.params.id || req.user!.id;

    const farmer = await User.findByPk(farmerId);
    
    if (!farmer || farmer.role !== UserRole.FARMER) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    // Get related stats (placeholder - replace with actual queries)
    const stats = {
      profile: {
        name: farmer.name,
        location: farmer.location,
        farmSize: farmer.farmSize
      },
      crops: 0, // Count from Crop model
      diseases: 0, // Count from DiseaseDetection model
      soilTests: 0, // Count from SoilTest model
      coursesCompleted: 0, // Count from Enrollment model
      lastActivity: farmer.lastLogin
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
