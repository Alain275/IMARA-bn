import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getCommodityPrices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prices = [
      { name: 'Maize', price: 450, unit: 'RWF/kg', change: 5.2, trend: 'up' },
      { name: 'Beans', price: 800, unit: 'RWF/kg', change: -2.1, trend: 'down' },
      { name: 'Rice', price: 1200, unit: 'RWF/kg', change: 3.8, trend: 'up' }
    ];

    res.json({ success: true, data: prices });
  } catch (error) {
    next(error);
  }
};

export const getPriceHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const history = Array.from({ length: 6 }, (_, i) => ({
      week: `W${i + 1}`,
      maize: 420 + Math.random() * 30,
      beans: 800 + Math.random() * 30
    }));

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

export const getMarketDemand = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const demand = [
      { crop: 'Maize', demand: 85 },
      { crop: 'Beans', demand: 72 },
      { crop: 'Rice', demand: 90 }
    ];

    res.json({ success: true, data: demand });
  } catch (error) {
    next(error);
  }
};

export const getBuyers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const buyers = [
      { id: 1, name: 'Rwanda Food Processing Ltd', type: 'Processor', location: 'Kigali', rating: 4.8 },
      { id: 2, name: 'Eastern Grains Cooperative', type: 'Cooperative', location: 'Rwamagana', rating: 4.5 }
    ];

    res.json({ success: true, data: buyers });
  } catch (error) {
    next(error);
  }
};
