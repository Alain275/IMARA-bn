import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import DiseaseDetection from '../models/DiseaseDetection';
import Crop from '../models/Crop';
import User from '../models/User';
import sequelize from '../config/database';
import { Op } from 'sequelize';
import { detectDiseaseWithAI } from '../services/aiService';

// Get user's disease detections
export const getDiseaseDetections = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { severity, cropId, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.id };
    if (severity) where.severity = severity;
    if (cropId) where.cropId = cropId;

    const { rows: detections, count } = await DiseaseDetection.findAndCountAll({
      where,
      include: [{ model: Crop, as: 'crop' }],
      limit: Number(limit),
      offset,
      order: [['detectedAt', 'DESC']]
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

    const detection = await DiseaseDetection.findOne({
      where: { id, userId: req.user!.id },
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
    const { imageUrl, cropId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    try {
      // Call AI service for detection
      const aiResult = await detectDiseaseWithAI(imageUrl);

      // Determine severity based on confidence
      let severity: 'low' | 'medium' | 'high' = 'medium';
      if (aiResult.prediction.confidence >= 80) {
        severity = 'high';
      } else if (aiResult.prediction.confidence < 60) {
        severity = 'low';
      }

      // Save detection to database with pending review status
      const detection = await DiseaseDetection.create({
        userId: req.user!.id,
        cropId,
        diseaseName: aiResult.prediction.disease,
        confidence: aiResult.prediction.confidence,
        severity,
        imageUrl,
        symptoms: aiResult.details.symptoms,
        treatment: aiResult.details.treatment,
        prevention: aiResult.details.prevention,
        aiPrediction: aiResult.prediction.disease,
        aiConfidence: aiResult.prediction.confidence,
        verificationStatus: 'pending_review',
        detectedAt: new Date()
      });

      res.json({
        success: true,
        message: '⚠️ AI Detection Complete - Awaiting Agronomist Verification',
        data: {
          detection,
          aiResult: {
            ...aiResult,
            warning: 'This is an AI prediction. Please wait for agronomist verification before taking action.'
          }
        }
      });
    } catch (aiError: any) {
      console.error('AI Service Error:', aiError);
      
      // Fallback: Save as unverified detection
      const detection = await DiseaseDetection.create({
        userId: req.user!.id,
        cropId,
        diseaseName: 'Unknown - AI Service Unavailable',
        confidence: 0,
        severity: 'medium',
        imageUrl,
        verificationStatus: 'pending_review',
        detectedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Image uploaded. AI service unavailable - Agronomist review required.',
        data: { detection },
        warning: 'AI detection failed. An agronomist will review your submission.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Agronomist verifies/corrects AI detection
export const verifyDiseaseDetection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { diseaseName, severity, treatment, prevention, verificationNotes, isCorrect } = req.body;

    const detection = await DiseaseDetection.findByPk(id);

    if (!detection) {
      return res.status(404).json({ success: false, message: 'Disease detection not found' });
    }

    // Update with agronomist verification
    detection.verifiedBy = req.user!.id;
    detection.verificationStatus = isCorrect ? 'verified' : 'corrected';
    detection.verificationNotes = verificationNotes;

    if (!isCorrect) {
      // Agronomist corrected the AI prediction
      if (diseaseName) detection.diseaseName = diseaseName;
      if (severity) detection.severity = severity;
      if (treatment) detection.treatment = treatment;
      if (prevention) detection.prevention = prevention;
    }

    await detection.save();

    res.json({
      success: true,
      message: isCorrect ? 'AI prediction verified' : 'Detection corrected by agronomist',
      data: detection
    });
  } catch (error) {
    next(error);
  }
};
