import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import MarketPrice from '../models/MarketPrice';
import Crop from '../models/Crop';
import sequelize from '../config/database';
import { Op } from 'sequelize';

// Get current market prices
export const getMarketPrices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cropId, location, market, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {
      priceDate: {
        [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    };
    
    if (cropId) where.cropId = cropId;
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (market) where.market = { [Op.iLike]: `%${market}%` };

    const { rows: prices, count } = await MarketPrice.findAndCountAll({
      where,
      include: [{ model: Crop, as: 'crop' }],
      limit: Number(limit),
      offset,
      order: [['priceDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        prices,
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

// Get price by ID
export const getPriceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const price = await MarketPrice.findByPk(id, {
      include: [{ model: Crop, as: 'crop' }]
    });

    if (!price) {
      return res.status(404).json({ success: false, message: 'Price record not found' });
    }

    res.json({ success: true, data: price });
  } catch (error) {
    next(error);
  }
};

// Get price trends
export const getPriceTrends = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cropId, location, days = 30 } = req.query;

    if (!cropId) {
      return res.status(400).json({
        success: false,
        message: 'Crop ID is required'
      });
    }

    const where: any = {
      cropId,
      priceDate: {
        [Op.gte]: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)
      }
    };

    if (location) where.location = { [Op.iLike]: `%${location}%` };

    const trends = await MarketPrice.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('priceDate')), 'date'],
        [sequelize.fn('AVG', sequelize.col('price')), 'avgPrice'],
        [sequelize.fn('MIN', sequelize.col('price')), 'minPrice'],
        [sequelize.fn('MAX', sequelize.col('price')), 'maxPrice'],
        [sequelize.fn('SUM', sequelize.col('volume')), 'totalVolume']
      ],
      group: [sequelize.fn('DATE', sequelize.col('priceDate'))],
      order: [[sequelize.fn('DATE', sequelize.col('priceDate')), 'ASC']],
      raw: true
    });

    // Calculate price change
    const priceChange = trends.length >= 2
      ? ((Number(trends[trends.length - 1].avgPrice) - Number(trends[0].avgPrice)) / Number(trends[0].avgPrice)) * 100
      : 0;

    res.json({
      success: true,
      data: {
        trends,
        priceChange: priceChange.toFixed(2),
        period: `${days} days`
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get market summary
export const getMarketSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location } = req.query;

    const where: any = {
      priceDate: {
        [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    };

    if (location) where.location = { [Op.iLike]: `%${location}%` };

    const summary = await MarketPrice.findAll({
      where,
      include: [{ model: Crop, as: 'crop', attributes: ['name', 'category'] }],
      attributes: [
        'cropId',
        [sequelize.fn('AVG', sequelize.col('price')), 'avgPrice'],
        [sequelize.fn('MIN', sequelize.col('price')), 'minPrice'],
        [sequelize.fn('MAX', sequelize.col('price')), 'maxPrice'],
        [sequelize.fn('SUM', sequelize.col('volume')), 'totalVolume'],
        'unit',
        'currency'
      ],
      group: ['cropId', 'MarketPrice.unit', 'MarketPrice.currency', 'crop.id'],
      order: [[sequelize.fn('SUM', sequelize.col('volume')), 'DESC']],
      limit: 10
    });

    const totalVolume = await MarketPrice.sum('volume', { where });

    res.json({
      success: true,
      data: {
        summary,
        totalVolume: totalVolume || 0,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get price alerts (placeholder)
export const getPriceAlerts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Placeholder for price alerts based on user preferences
    const alerts = [
      {
        id: '1',
        type: 'price_increase',
        cropName: 'Maize',
        message: 'Maize prices increased by 8% this week',
        currentPrice: 450,
        previousPrice: 415,
        change: 8.4,
        recommendation: 'Good time to sell if you have inventory'
      },
      {
        id: '2',
        type: 'high_demand',
        cropName: 'Beans',
        message: 'High demand for beans in Kimironko market',
        currentPrice: 800,
        trend: 'rising',
        recommendation: 'Consider harvesting early if possible'
      }
    ];

    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

// Add market price (Admin only - for data entry)
export const addMarketPrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cropId, market, location, price, unit, volume, quality, priceDate } = req.body;

    if (!cropId || !market || !location || !price || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Crop ID, market, location, price, and unit are required'
      });
    }

    const marketPrice = await MarketPrice.create({
      cropId,
      market,
      location,
      price,
      unit,
      currency: 'RWF',
      volume,
      quality,
      priceDate: priceDate || new Date(),
      source: 'manual'
    });

    res.status(201).json({
      success: true,
      message: 'Market price added successfully',
      data: marketPrice
    });
  } catch (error) {
    next(error);
  }
};

// Update market price
export const updateMarketPrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { price, volume, quality } = req.body;

    const marketPrice = await MarketPrice.findByPk(id);

    if (!marketPrice) {
      return res.status(404).json({ success: false, message: 'Price record not found' });
    }

    if (price !== undefined) marketPrice.price = price;
    if (volume !== undefined) marketPrice.volume = volume;
    if (quality !== undefined) marketPrice.quality = quality;

    await marketPrice.save();

    res.json({
      success: true,
      message: 'Market price updated successfully',
      data: marketPrice
    });
  } catch (error) {
    next(error);
  }
};

// Delete market price
export const deleteMarketPrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const marketPrice = await MarketPrice.findByPk(id);

    if (!marketPrice) {
      return res.status(404).json({ success: false, message: 'Price record not found' });
    }

    await marketPrice.destroy();

    res.json({
      success: true,
      message: 'Market price deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
