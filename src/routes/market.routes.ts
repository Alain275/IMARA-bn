import { Router } from 'express';
import { 
  getCommodityPrices,
  getPriceHistory,
  getMarketDemand,
  getBuyers
} from '../controllers/market.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/prices', getCommodityPrices);
router.get('/history', getPriceHistory);
router.get('/demand', getMarketDemand);
router.get('/buyers', getBuyers);

export default router;
