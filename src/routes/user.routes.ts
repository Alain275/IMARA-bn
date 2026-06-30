import { Router } from 'express';
import { 
  // Profile Management
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  // User Management (Admin)
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  // Farmers
  getAllFarmers,
  getFarmerStats
} from '../controllers/user.controller';
import { protectRoute } from '../middleware/protectRoute';
import { restrictTo } from '../middleware/restrictTo';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication + live user check
router.use(protectRoute);

// Profile Routes
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/password', changePassword);
router.delete('/account', deleteAccount);

// User Management Routes (Admin)
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

// Farmers Routes
router.get('/farmers/all', restrictTo(UserRole.ADMIN, UserRole.AGRONOMIST), getAllFarmers);
router.get('/farmers/stats', getFarmerStats); // own stats — any authenticated user
router.get('/farmers/:id/stats', restrictTo(UserRole.ADMIN, UserRole.AGRONOMIST, UserRole.FARMER), getFarmerStats);

export default router;
