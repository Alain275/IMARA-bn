import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import SoilTest from '../models/SoilTest';
import { Op } from 'sequelize';

// Get user's soil tests
export const getSoilTests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, location } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.id };
    if (location) where.location = { [Op.iLike]: `%${location}%` };

    const { rows: tests, count } = await SoilTest.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['testDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        tests,
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

// Get latest soil test
export const getLatestSoilTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const test = await SoilTest.findOne({
      where: { userId: req.user!.id },
      order: [['testDate', 'DESC']]
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'No soil test found' });
    }

    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

// Get soil test by ID
export const getSoilTestById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const test = await SoilTest.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Soil test not found' });
    }

    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

// Create soil test
export const createSoilTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      ph,
      nitrogen,
      phosphorus,
      potassium,
      organicMatter,
      texture,
      location,
      notes,
      testDate
    } = req.body;

    if (!ph || nitrogen === undefined || phosphorus === undefined || potassium === undefined) {
      return res.status(400).json({
        success: false,
        message: 'pH, nitrogen, phosphorus, and potassium are required'
      });
    }

    const test = await SoilTest.create({
      userId: req.user!.id,
      ph,
      nitrogen,
      phosphorus,
      potassium,
      organicMatter,
      texture,
      location,
      notes,
      testDate: testDate || new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Soil test created successfully',
      data: test
    });
  } catch (error) {
    next(error);
  }
};

// Update soil test
export const updateSoilTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      ph,
      nitrogen,
      phosphorus,
      potassium,
      organicMatter,
      texture,
      location,
      notes
    } = req.body;

    const test = await SoilTest.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Soil test not found' });
    }

    if (ph !== undefined) test.ph = ph;
    if (nitrogen !== undefined) test.nitrogen = nitrogen;
    if (phosphorus !== undefined) test.phosphorus = phosphorus;
    if (potassium !== undefined) test.potassium = potassium;
    if (organicMatter !== undefined) test.organicMatter = organicMatter;
    if (texture !== undefined) test.texture = texture;
    if (location !== undefined) test.location = location;
    if (notes !== undefined) test.notes = notes;

    await test.save();

    res.json({
      success: true,
      message: 'Soil test updated successfully',
      data: test
    });
  } catch (error) {
    next(error);
  }
};

// Delete soil test
export const deleteSoilTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const test = await SoilTest.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Soil test not found' });
    }

    await test.destroy();

    res.json({
      success: true,
      message: 'Soil test deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get soil analysis and recommendations
export const getSoilAnalysis = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const test = await SoilTest.findOne({
      where: { userId: req.user!.id },
      order: [['testDate', 'DESC']]
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'No soil test found' });
    }

    // Calculate health score
    const phScore = test.ph >= 6.0 && test.ph <= 7.5 ? 100 : Math.max(0, 100 - Math.abs(6.5 - test.ph) * 20);
    const nScore = Math.min(100, (test.nitrogen / 50) * 100);
    const pScore = Math.min(100, (test.phosphorus / 40) * 100);
    const kScore = Math.min(100, (test.potassium / 60) * 100);
    const omScore = test.organicMatter ? Math.min(100, (test.organicMatter / 5) * 100) : 50;
    
    const healthScore = Math.round((phScore + nScore + pScore + kScore + omScore) / 5);

    // Generate recommendations
    const recommendations = [];
    
    if (test.nitrogen < 40) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Add Nitrogen Fertilizer',
        description: `Your soil nitrogen level is ${test.nitrogen}mg/kg. Apply 50kg/ha of urea during planting.`,
        nutrient: 'nitrogen'
      });
    }

    if (test.phosphorus < 30) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Increase Phosphorus',
        description: `Phosphorus level is ${test.phosphorus}mg/kg. Apply DAP fertilizer at 40kg/ha.`,
        nutrient: 'phosphorus'
      });
    }

    if (test.potassium < 50) {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        title: 'Add Potassium',
        description: `Potassium level is ${test.potassium}mg/kg. Consider applying potash fertilizer.`,
        nutrient: 'potassium'
      });
    }

    if (test.ph < 6.0 || test.ph > 7.5) {
      recommendations.push({
        type: 'action',
        priority: test.ph < 5.5 || test.ph > 8.0 ? 'high' : 'medium',
        title: `Adjust Soil pH (Current: ${test.ph})`,
        description: test.ph < 6.0 
          ? 'Apply lime to increase pH' 
          : 'Apply sulfur or organic matter to decrease pH',
        nutrient: 'ph'
      });
    } else {
      recommendations.push({
        type: 'info',
        priority: 'low',
        title: 'pH Level Optimal',
        description: `Your soil pH of ${test.ph} is ideal for most crops.`,
        nutrient: 'ph'
      });
    }

    // Crop suitability
    const cropSuitability = [
      { crop: 'Maize', suitability: Math.min(100, healthScore + 10), status: 'excellent' },
      { crop: 'Beans', suitability: Math.min(100, healthScore + 5), status: 'excellent' },
      { crop: 'Irish Potatoes', suitability: Math.max(50, healthScore - 5), status: 'good' },
      { crop: 'Tomatoes', suitability: Math.max(50, healthScore - 10), status: 'good' },
      { crop: 'Rice', suitability: Math.max(30, healthScore - 30), status: 'fair' },
      { crop: 'Wheat', suitability: Math.max(20, healthScore - 40), status: 'fair' }
    ];

    res.json({
      success: true,
      data: {
        test,
        healthScore,
        recommendations,
        cropSuitability,
        nutrientProfile: {
          ph: { value: test.ph, score: Math.round(phScore), status: phScore > 75 ? 'good' : phScore > 50 ? 'fair' : 'poor' },
          nitrogen: { value: test.nitrogen, score: Math.round(nScore), status: nScore > 75 ? 'good' : nScore > 50 ? 'fair' : 'poor' },
          phosphorus: { value: test.phosphorus, score: Math.round(pScore), status: pScore > 75 ? 'good' : pScore > 50 ? 'fair' : 'poor' },
          potassium: { value: test.potassium, score: Math.round(kScore), status: kScore > 75 ? 'good' : kScore > 50 ? 'fair' : 'poor' },
          organicMatter: { value: test.organicMatter || 0, score: Math.round(omScore), status: omScore > 75 ? 'good' : omScore > 50 ? 'fair' : 'poor' }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
