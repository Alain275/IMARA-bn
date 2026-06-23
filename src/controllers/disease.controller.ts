import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import DiseaseDetection from '../models/DiseaseDetection';
import Crop from '../models/Crop';
import User from '../models/User';
import sequelize from '../config/database';
import { Op } from 'sequelize';
import { detectDiseaseWithAI } from '../services/aiDisease.service';

// Get user's disease detections
export const getDiseaseDetections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { severity, cropId, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Only farmers getting their own detections
    const where: any = { userId: req.user!.id };
    if (severity) where.severity = severity;
    if (cropId) where.cropId = cropId;

    const { rows: detections, count } = await DiseaseDetection.findAndCountAll({
      where,
      include: [{ model: Crop, as: 'crop' }],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        detections,
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

// Get pending disease detections for agronomist
export const getPendingDetections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'agronomist' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only agronomists or admins can view pending detections.'
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { rows: detections, count } = await DiseaseDetection.findAndCountAll({
      where: { status: 'pending_review' },
      include: [{ model: Crop, as: 'crop' }],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        detections,
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

// Get disease detection by ID
export const getDiseaseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const whereClause: any = { id };
    
    // Only restrict to user's own if they are a farmer
    if (req.user?.role === 'farmer') {
      whereClause.userId = req.user.id;
    }

    const detection = await DiseaseDetection.findOne({
      where: whereClause,
      include: [{ model: Crop, as: 'crop' }]
    });

    if (!detection) {
      return res.status(404).json({ success: false, message: 'Disease detection not found' });
    }

    res.json({ success: true, data: detection });
  } catch (error) {
    next(error);
  }
};

// Create disease detection (placeholder for AI - manual entry for now)
export const createDiseaseDetection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      cropId,
      diseaseName,
      confidence,
      severity,
      imageUrl,
      symptoms,
      treatment,
      prevention
    } = req.body;

    if (!diseaseName || !severity) {
      return res.status(400).json({
        success: false,
        message: 'Disease name and severity are required'
      });
    }

    const detection = await DiseaseDetection.create({
      userId: req.user!.id,
      cropId,
      diseaseName,
      confidence: confidence || 85,
      severity,
      imageUrl,
      symptoms,
      treatment,
      prevention,
      detectedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Disease detection recorded successfully',
      data: detection
    });
  } catch (error) {
    next(error);
  }
};

// Update disease detection
export const updateDiseaseDetection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { severity, symptoms, treatment, prevention, notes } = req.body;

    const detection = await DiseaseDetection.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!detection) {
      return res.status(404).json({ success: false, message: 'Disease detection not found' });
    }

    if (severity !== undefined) detection.severity = severity;
    if (symptoms !== undefined) detection.symptoms = symptoms;
    if (treatment !== undefined) detection.treatment = treatment;
    if (prevention !== undefined) detection.prevention = prevention;

    await detection.save();

    res.json({
      success: true,
      message: 'Disease detection updated successfully',
      data: detection
    });
  } catch (error) {
    next(error);
  }
};

// Delete disease detection
export const deleteDiseaseDetection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const detection = await DiseaseDetection.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!detection) {
      return res.status(404).json({ success: false, message: 'Disease detection not found' });
    }

    await detection.destroy();

    res.json({
      success: true,
      message: 'Disease detection deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get disease statistics
export const getDiseaseStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const total = await DiseaseDetection.count({
      where: { userId: req.user!.id }
    });

    const bySeverity = await DiseaseDetection.findAll({
      where: { userId: req.user!.id },
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['severity'],
      raw: true
    });

    const recent = await DiseaseDetection.findAll({
      where: {
        userId: req.user!.id,
        detectedAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      limit: 5,
      order: [['detectedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        total,
        bySeverity,
        recent,
        lastDetection: recent.length > 0 ? recent[0].detectedAt : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// Detect disease from image (AI-powered)
export const detectDiseaseFromImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Validate role is farmer
    if (req.user?.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Only farmers can submit disease detection requests.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'An image file is required.'
      });
    }

    // Call AI service for detection
    const aiResult = await detectDiseaseWithAI(req.file.buffer, req.file.originalname);

    // Save detection to database with pending review status
    const detection = await DiseaseDetection.create({
      userId: req.user!.id,
      imageUrl: null, // Store null since we are using memory storage and not saving to disk
      
      aiDisease: aiResult.prediction.disease,
      aiCrop: aiResult.prediction.crop,
      aiConfidence: aiResult.prediction.confidence,
      aiModel: aiResult.metadata.model,
      aiMode: aiResult.metadata.mode,
      demoMode: aiResult.metadata.demo_mode,
      
      symptoms: aiResult.details.symptoms,
      treatment: aiResult.details.treatment,
      prevention: aiResult.details.prevention,
      
      status: 'pending_review'
    });

    res.status(201).json({
      success: true,
      message: 'AI diagnosis completed. Awaiting agronomist verification.',
      data: detection
    });
  } catch (error: any) {
    if (error.message && error.message.includes('AI Service')) {
      return res.status(502).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// Agronomist verifies/corrects AI detection
export const verifyDiseaseDetection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, verifiedDisease, verifiedTreatment, agronomistComment } = req.body;

    // Validate role is agronomist or admin
    if (req.user?.role !== 'agronomist' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only agronomists or admins can verify disease detections.'
      });
    }

    const detection = await DiseaseDetection.findByPk(id);

    if (!detection) {
      return res.status(404).json({ success: false, message: 'Disease detection not found' });
    }

    // Update with agronomist verification
    detection.verifiedBy = req.user!.id;
    detection.verifiedAt = new Date();
    
    if (status) detection.status = status;
    if (verifiedDisease) detection.verifiedDisease = verifiedDisease;
    if (verifiedTreatment) detection.verifiedTreatment = verifiedTreatment;
    if (agronomistComment) detection.agronomistComment = agronomistComment;

    await detection.save();

    res.json({
      success: true,
      message: 'Disease detection verification updated successfully.',
      data: detection
    });
  } catch (error) {
    next(error);
  }
};
