import { Router } from 'express';
import {
  getMarketPrices,
  getPriceById,
  getPriceTrends,
  getMarketSummary,
  getPriceAlerts,
  addMarketPrice,
  updateMarketPrice,
  deleteMarketPrice
} from '../controllers/market.controller';
import { protectRoute } from '../middleware/protectRoute';
import { restrictTo } from '../middleware/restrictTo';
import { UserRole } from '../models/User';

const router = Router();

router.use(protectRoute);

router.get('/prices', getMarketPrices);
router.get('/prices/:id', getPriceById);
router.get('/trends', getPriceTrends);
router.get('/summary', getMarketSummary);
router.get('/alerts', getPriceAlerts);

// Admin-only data entry
router.post('/prices', restrictTo(UserRole.ADMIN), addMarketPrice);
router.patch('/prices/:id', restrictTo(UserRole.ADMIN), updateMarketPrice);
router.delete('/prices/:id', restrictTo(UserRole.ADMIN), deleteMarketPrice);

export default router;
