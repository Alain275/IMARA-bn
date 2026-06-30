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

    // Scoring thresholds (heuristic engineering defaults — must be reviewed by
    // a certified agronomist familiar with Rwanda's soil conditions before use
    // in clinical or commercial advisory contexts).
    //
    // pH:  optimal 6.0–7.5; −20 pts per unit outside that range, floor 0
    // N:   optimal ≥ 50 mg/kg (urea-based intensive cropping reference)
    // P:   optimal ≥ 40 mg/kg (DAP application threshold)
    // K:   optimal ≥ 60 mg/kg (East Africa maize/bean reference)
    // OM:  optimal ≥ 5 % (high organic matter; 3 % is considered adequate)
    const phScore = test.ph >= 6.0 && test.ph <= 7.5 ? 100 : Math.max(0, 100 - Math.abs(6.5 - test.ph) * 20);
    const nScore = Math.min(100, (test.nitrogen / 50) * 100);
    const pScore = Math.min(100, (test.phosphorus / 40) * 100);
    const kScore = Math.min(100, (test.potassium / 60) * 100);
    const omScore = test.organicMatter != null ? Math.min(100, (test.organicMatter / 5) * 100) : 50;

    const healthScore = Math.round((phScore + nScore + pScore + kScore + omScore) / 5);

    const scoreStatus = (s: number) => (s > 75 ? 'good' : s > 50 ? 'fair' : 'poor');

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

    // Crop suitability scores are relative to overall soil health.
    // Status is derived from the computed score, not hardcoded.
    const cropSuitabilityRaw = [
      { crop: 'Maize',          score: Math.min(100, healthScore + 10) },
      { crop: 'Beans',          score: Math.min(100, healthScore + 5)  },
      { crop: 'Irish Potatoes', score: Math.max(0,   healthScore - 5)  },
      { crop: 'Tomatoes',       score: Math.max(0,   healthScore - 10) },
      { crop: 'Rice',           score: Math.max(0,   healthScore - 30) },
      { crop: 'Wheat',          score: Math.max(0,   healthScore - 40) },
    ];
    const cropSuitability = cropSuitabilityRaw.map(({ crop, score }) => ({
      crop,
      suitability: score,
      status: score > 75 ? 'excellent' : score > 50 ? 'good' : score > 25 ? 'fair' : 'poor',
    }));

    res.json({
      success: true,
      data: {
        test,
        healthScore,
        recommendations,
        cropSuitability,
        nutrientProfile: {
          ph:           { value: test.ph,                    score: Math.round(phScore), status: scoreStatus(phScore) },
          nitrogen:     { value: test.nitrogen,              score: Math.round(nScore),  status: scoreStatus(nScore)  },
          phosphorus:   { value: test.phosphorus,            score: Math.round(pScore),  status: scoreStatus(pScore)  },
          potassium:    { value: test.potassium,             score: Math.round(kScore),  status: scoreStatus(kScore)  },
          organicMatter:{ value: test.organicMatter ?? null, score: Math.round(omScore), status: scoreStatus(omScore) },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
