import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Question from '../models/Question';
import User from '../models/User';

// Farmer creates question
export const createQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { question, category } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    const newQuestion = await Question.create({
      farmerId: req.user!.id,
      question,
      category,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Question submitted successfully',
      data: newQuestion
    });
  } catch (error) {
    next(error);
  }
};

// Get farmer's own questions
export const getMyQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { farmerId: req.user!.id };
    if (status) where.status = status;

    const { rows: questions, count } = await Question.findAndCountAll({
      where,
      include: [{ model: User, as: 'agronomist', attributes: ['id', 'name'] }],
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

// Get question by ID
export const getQuestionById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const question = await Question.findOne({
      where: { id, farmerId: req.user!.id },
      include: [
        { model: User, as: 'farmer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'agronomist', attributes: ['id', 'name'] }
      ]
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};
