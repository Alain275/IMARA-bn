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
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/prices', getMarketPrices);
router.get('/prices/:id', getPriceById);
router.get('/trends', getPriceTrends);
router.get('/summary', getMarketSummary);
router.get('/alerts', getPriceAlerts);

// Admin routes (add role check middleware if needed)
router.post('/prices', addMarketPrice);
router.patch('/prices/:id', updateMarketPrice);
router.delete('/prices/:id', deleteMarketPrice);

export default router;
