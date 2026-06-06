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
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

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
router.get('/farmers/all', getAllFarmers);
router.get('/farmers/:id/stats', getFarmerStats);
router.get('/farmers/stats', getFarmerStats); // Current farmer stats

export default router;
