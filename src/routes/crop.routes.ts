import { Router } from 'express';
import {
  getAllCrops,
  getCropById,
  getCropRecommendations,
  getFarmerCrops,
  addFarmerCrop,
  updateFarmerCrop,
  deleteFarmerCrop
} from '../controllers/crop.controller';
import { protectRoute } from '../middleware/protectRoute';

const router = Router();

// Public routes
router.get('/catalog', getAllCrops);
router.get('/catalog/:id', getCropById);

// Protected routes
router.use(protectRoute);

router.get('/recommendations', getCropRecommendations);
router.get('/my-crops', getFarmerCrops);
router.post('/my-crops', addFarmerCrop);
router.patch('/my-crops/:id', updateFarmerCrop);
router.delete('/my-crops/:id', deleteFarmerCrop);

export default router;
