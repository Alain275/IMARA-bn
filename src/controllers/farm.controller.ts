import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Farm from '../models/Farm';
import { Op } from 'sequelize';

// Create a new farm
export const createFarm = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      farmName,
      size,
      location,
      district,
      sector,
      cell,
      village,
      soilType,
      irrigationType,
      currentCrop,
      plantingDate,
      expectedHarvestDate,
      seedVariety,
      coordinates,
      notes
    } = req.body;

    // Validation
    if (!farmName || !size || !district || !sector || !cell || !village) {
      return res.status(400).json({
        success: false,
        message: 'Farm name, size, district, sector, cell, and village are required'
      });
    }

    const farm = await Farm.create({
      userId: req.user!.id,
      farmName,
      size,
      location: location || `${village}, ${cell}, ${sector}, ${district}`,
      district,
      sector,
      cell,
      village,
      soilType,
      irrigationType,
      currentCrop,
      plantingDate: plantingDate ? new Date(plantingDate) : undefined,
      expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : undefined,
      seedVariety,
      coordinates,
      status: 'active',
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Farm registered successfully',
      data: farm
    });
  } catch (error) {
    next(error);
  }
};

// Get all farms for the authenticated user
export const getFarms = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, district, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.id };
    if (status) where.status = status;
    if (district) where.district = district;

    const { rows: farms, count } = await Farm.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        farms,
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

// Get single farm by ID
export const getFarmById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const farm = await Farm.findOne({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found'
      });
    }

    res.json({
      success: true,
      data: farm
    });
  } catch (error) {
    next(error);
  }
};

// Update farm
export const updateFarm = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      farmName,
      size,
      location,
      district,
      sector,
      cell,
      village,
      soilType,
      irrigationType,
      currentCrop,
      plantingDate,
      expectedHarvestDate,
      seedVariety,
      coordinates,
      status,
      notes
    } = req.body;

    const farm = await Farm.findOne({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found'
      });
    }

    // Update fields
    if (farmName !== undefined) farm.farmName = farmName;
    if (size !== undefined) farm.size = size;
    if (location !== undefined) farm.location = location;
    if (district !== undefined) farm.district = district;
    if (sector !== undefined) farm.sector = sector;
    if (cell !== undefined) farm.cell = cell;
    if (village !== undefined) farm.village = village;
    if (soilType !== undefined) farm.soilType = soilType;
    if (irrigationType !== undefined) farm.irrigationType = irrigationType;
    if (currentCrop !== undefined) farm.currentCrop = currentCrop;
    if (plantingDate !== undefined) farm.plantingDate = plantingDate ? new Date(plantingDate) : undefined;
    if (expectedHarvestDate !== undefined) farm.expectedHarvestDate = expectedHarvestDate ? new Date(expectedHarvestDate) : undefined;
    if (seedVariety !== undefined) farm.seedVariety = seedVariety;
    if (coordinates !== undefined) farm.coordinates = coordinates;
    if (status !== undefined) farm.status = status;
    if (notes !== undefined) farm.notes = notes;

    await farm.save();

    res.json({
      success: true,
      message: 'Farm updated successfully',
      data: farm
    });
  } catch (error) {
    next(error);
  }
};

// Delete farm
export const deleteFarm = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const farm = await Farm.findOne({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found'
      });
    }

    await farm.destroy();

    res.json({
      success: true,
      message: 'Farm deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get farm statistics
export const getFarmStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const totalFarms = await Farm.count({
      where: { userId: req.user!.id }
    });

    const activeFarms = await Farm.count({
      where: {
        userId: req.user!.id,
        status: 'active'
      }
    });

    const totalArea = await Farm.sum('size', {
      where: { userId: req.user!.id }
    });

    const farmsByDistrict = await Farm.findAll({
      where: { userId: req.user!.id },
      attributes: ['district', [Farm.sequelize!.fn('COUNT', Farm.sequelize!.col('id')), 'count']],
      group: ['district'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        totalFarms,
        activeFarms,
        totalArea: totalArea || 0,
        farmsByDistrict
      }
    });
  } catch (error) {
    next(error);
  }
};
