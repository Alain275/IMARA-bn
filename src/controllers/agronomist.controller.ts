import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User, { UserRole } from '../models/User';
import AgronomistProfile from '../models/AgronomistProfile';
import FarmVisit from '../models/FarmVisit';
import Advice from '../models/Advice';
import Question from '../models/Question';
import TrainingMaterial from '../models/TrainingMaterial';
import Farm from '../models/Farm';
import FarmerCrop from '../models/FarmerCrop';
import Crop from '../models/Crop';
import { Op } from 'sequelize';

// Profile Management
export const getAgronomistProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByPk(req.user!.id, {
      include: [{ model: AgronomistProfile, as: 'agronomistProfile' }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateAgronomistProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { district, sector, specialization, yearsOfExperience, bio } = req.body;

    let profile = await AgronomistProfile.findOne({ where: { userId: req.user!.id } });

    if (!profile) {
      profile = await AgronomistProfile.create({
        userId: req.user!.id,
        district,
        sector,
        specialization,
        yearsOfExperience,
        bio
      });
    } else {
      if (district !== undefined) profile.district = district;
      if (sector !== undefined) profile.sector = sector;
      if (specialization !== undefined) profile.specialization = specialization;
      if (yearsOfExperience !== undefined) profile.yearsOfExperience = yearsOfExperience;
      if (bio !== undefined) profile.bio = bio;
      await profile.save();
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

// Farmer Management
export const getAssignedFarmers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { district, sector, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { role: UserRole.FARMER, isActive: true };
    if (district) where.location = { [Op.iLike]: `%${district}%` };

    const { rows: farmers, count } = await User.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        farmers,
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

export const getFarmerDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { farmerId } = req.params;

    const farmer = await User.findOne({
      where: { id: farmerId, role: UserRole.FARMER },
      include: [
        { model: Farm, as: 'farms' },
        { model: FarmerCrop, as: 'farmerCrops', include: [{ model: Crop, as: 'crop' }] }
      ]
    });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    res.json({ success: true, data: farmer });
  } catch (error) {
    next(error);
  }
};

// Farm Visits
export const createFarmVisit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { farmerId, farmId, visitDate, observations, recommendations, nextVisitDate } = req.body;

    if (!farmerId || !visitDate || !observations || !recommendations) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID, visit date, observations, and recommendations are required'
      });
    }

    const visit = await FarmVisit.create({
      agronomistId: req.user!.id,
      farmerId,
      farmId,
      visitDate,
      observations,
      recommendations,
      nextVisitDate,
      status: 'scheduled'
    });

    res.status(201).json({
      success: true,
      message: 'Farm visit created successfully',
      data: visit
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmVisits = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, farmerId, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { agronomistId: req.user!.id };
    if (status) where.status = status;
    if (farmerId) where.farmerId = farmerId;

    const { rows: visits, count } = await FarmVisit.findAndCountAll({
      where,
      include: [
        { model: User, as: 'farmer', attributes: ['id', 'name', 'email', 'phone', 'location'] },
        { model: Farm, as: 'farm' }
      ],
      limit: Number(limit),
      offset,
      order: [['visitDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        visits,
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

export const getFarmVisitById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const visit = await FarmVisit.findOne({
      where: { id, agronomistId: req.user!.id },
      include: [
        { model: User, as: 'farmer' },
        { model: Farm, as: 'farm' }
      ]
    });

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Farm visit not found' });
    }

    res.json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
};

export const updateFarmVisit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { visitDate, observations, recommendations, nextVisitDate, status } = req.body;

    const visit = await FarmVisit.findOne({
      where: { id, agronomistId: req.user!.id }
    });

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Farm visit not found' });
    }

    if (visitDate !== undefined) visit.visitDate = visitDate;
    if (observations !== undefined) visit.observations = observations;
    if (recommendations !== undefined) visit.recommendations = recommendations;
    if (nextVisitDate !== undefined) visit.nextVisitDate = nextVisitDate;
    if (status !== undefined) visit.status = status;

    await visit.save();

    res.json({
      success: true,
      message: 'Farm visit updated successfully',
      data: visit
    });
  } catch (error) {
    next(error);
  }
};

// Advisory Services
export const createAdvice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { farmerId, farmId, title, problem, recommendation } = req.body;

    if (!farmerId || !title || !problem || !recommendation) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID, title, problem, and recommendation are required'
      });
    }

    const advice = await Advice.create({
      agronomistId: req.user!.id,
      farmerId,
      farmId,
      title,
      problem,
      recommendation,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Advice created successfully',
      data: advice
    });
  } catch (error) {
    next(error);
  }
};

export const getAdviceList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, farmerId, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { agronomistId: req.user!.id };
    if (status) where.status = status;
    if (farmerId) where.farmerId = farmerId;

    const { rows: adviceList, count } = await Advice.findAndCountAll({
      where,
      include: [
        { model: User, as: 'farmer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Farm, as: 'farm' }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        advice: adviceList,
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

export const getAdviceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const advice = await Advice.findOne({
      where: { id, agronomistId: req.user!.id },
      include: [
        { model: User, as: 'farmer' },
        { model: Farm, as: 'farm' }
      ]
    });

    if (!advice) {
      return res.status(404).json({ success: false, message: 'Advice not found' });
    }

    res.json({ success: true, data: advice });
  } catch (error) {
    next(error);
  }
};

export const updateAdvice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, problem, recommendation, status } = req.body;

    const advice = await Advice.findOne({
      where: { id, agronomistId: req.user!.id }
    });

    if (!advice) {
      return res.status(404).json({ success: false, message: 'Advice not found' });
    }

    if (title !== undefined) advice.title = title;
    if (problem !== undefined) advice.problem = problem;
    if (recommendation !== undefined) advice.recommendation = recommendation;
    if (status !== undefined) advice.status = status;

    await advice.save();

    res.json({
      success: true,
      message: 'Advice updated successfully',
      data: advice
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdvice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const advice = await Advice.findOne({
      where: { id, agronomistId: req.user!.id }
    });

    if (!advice) {
      return res.status(404).json({ success: false, message: 'Advice not found' });
    }

    await advice.destroy();

    res.json({
      success: true,
      message: 'Advice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Questions (Farmer asks, Agronomist answers)
export const getQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const { rows: questions, count } = await Question.findAndCountAll({
      where,
      include: [
        { model: User, as: 'farmer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'agronomist', attributes: ['id', 'name'] }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        questions,
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

export const answerQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({
        success: false,
        message: 'Answer is required'
      });
    }

    const question = await Question.findByPk(id);

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    question.answer = answer;
    question.answeredBy = req.user!.id;
    question.status = 'answered';
    await question.save();

    res.json({
      success: true,
      message: 'Question answered successfully',
      data: question
    });
  } catch (error) {
    next(error);
  }
};

// Training Materials
export const createTrainingMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, content, videoUrl, pdfUrl, category, language } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and category are required'
      });
    }

    const material = await TrainingMaterial.create({
      createdBy: req.user!.id,
      title,
      description,
      content,
      videoUrl,
      pdfUrl,
      category,
      language: language || 'en',
      isPublished: false,
      viewCount: 0
    });

    res.status(201).json({
      success: true,
      message: 'Training material created successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

export const getTrainingMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, language, isPublished, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (category) where.category = category;
    if (language) where.language = language;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';

    const { rows: materials, count } = await TrainingMaterial.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        materials,
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

export const getTrainingMaterialById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const material = await TrainingMaterial.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }]
    });

    if (!material) {
      return res.status(404).json({ success: false, message: 'Training material not found' });
    }

    // Increment view count
    material.viewCount += 1;
    await material.save();

    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

export const updateTrainingMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, content, videoUrl, pdfUrl, category, language, isPublished } = req.body;

    const material = await TrainingMaterial.findOne({
      where: { id, createdBy: req.user!.id }
    });

    if (!material) {
      return res.status(404).json({ success: false, message: 'Training material not found' });
    }

    if (title !== undefined) material.title = title;
    if (description !== undefined) material.description = description;
    if (content !== undefined) material.content = content;
    if (videoUrl !== undefined) material.videoUrl = videoUrl;
    if (pdfUrl !== undefined) material.pdfUrl = pdfUrl;
    if (category !== undefined) material.category = category;
    if (language !== undefined) material.language = language;
    if (isPublished !== undefined) material.isPublished = isPublished;

    await material.save();

    res.json({
      success: true,
      message: 'Training material updated successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTrainingMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const material = await TrainingMaterial.findOne({
      where: { id, createdBy: req.user!.id }
    });

    if (!material) {
      return res.status(404).json({ success: false, message: 'Training material not found' });
    }

    await material.destroy();

    res.json({
      success: true,
      message: 'Training material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
