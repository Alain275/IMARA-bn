import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Crop from '../models/Crop';
import FarmerCrop from '../models/FarmerCrop';
import { Op } from 'sequelize';

// Get all crops (catalog)
export const getAllCrops = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, waterNeed, season, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (category) where.category = category;
    if (waterNeed) where.waterNeed = waterNeed;
    if (season) where.season = { [Op.iLike]: `%${season}%` };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { scientificName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows: crops, count } = await Crop.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        crops,
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

// Get single crop
export const getCropById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const crop = await Crop.findByPk(id);
    
    if (!crop) {
      return res.status(404).json({ success: false, message: 'Crop not found' });
    }

    res.json({ success: true, data: crop });
  } catch (error) {
    next(error);
  }
};

// Get crop recommendations (placeholder for AI)
export const getCropRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location, soilType, season } = req.query;

    // Placeholder - will be replaced with AI model
    const crops = await Crop.findAll({
      limit: 10,
      order: [['name', 'ASC']]
    });

    const recommendations = crops.map(crop => ({
      ...crop.toJSON(),
      suitability: Math.floor(Math.random() * 30) + 70, // Placeholder score
      reasons: ['Good soil match', 'Optimal season', 'Local demand high']
    }));

    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
};

// Get farmer's crops
export const getFarmerCrops = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.id };
    if (status) where.status = status;

    const { rows: farmerCrops, count } = await FarmerCrop.findAndCountAll({
      where,
      include: [{ model: Crop, as: 'crop' }],
      limit: Number(limit),
      offset,
      order: [['plantingDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        crops: farmerCrops,
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

// Add crop to farmer's farm
export const addFarmerCrop = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cropId, farmId, plantingDate, areaPlanted, expectedHarvestDate, notes } = req.body;

    if (!cropId || !plantingDate || !areaPlanted) {
      return res.status(400).json({
        success: false,
        message: 'Crop ID, planting date, and area planted are required'
      });
    }

    const crop = await Crop.findByPk(cropId);
    if (!crop) {
      return res.status(404).json({ success: false, message: 'Crop not found' });
    }

    const farmerCrop = await FarmerCrop.create({
      userId: req.user!.id,
      cropId,
      farmId,
      plantingDate,
      areaPlanted,
      expectedHarvestDate,
      notes,
      status: 'planted'
    });

    res.status(201).json({
      success: true,
      message: 'Crop added successfully',
      data: farmerCrop
    });
  } catch (error) {
    next(error);
  }
};

// Update farmer's crop
export const updateFarmerCrop = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, actualHarvestDate, yield: cropYield, notes } = req.body;

    const farmerCrop = await FarmerCrop.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!farmerCrop) {
      return res.status(404).json({ success: false, message: 'Crop record not found' });
    }

    if (status !== undefined) farmerCrop.status = status;
    if (actualHarvestDate !== undefined) farmerCrop.actualHarvestDate = actualHarvestDate;
    if (cropYield !== undefined) farmerCrop.yield = cropYield;
    if (notes !== undefined) farmerCrop.notes = notes;

    await farmerCrop.save();

    res.json({
      success: true,
      message: 'Crop updated successfully',
      data: farmerCrop
    });
  } catch (error) {
    next(error);
  }
};

// Delete farmer's crop
export const deleteFarmerCrop = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const farmerCrop = await FarmerCrop.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!farmerCrop) {
      return res.status(404).json({ success: false, message: 'Crop record not found' });
    }

    await farmerCrop.destroy();

    res.json({
      success: true,
      message: 'Crop removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
