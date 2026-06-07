import { Router } from 'express';
import {
  createQuestion,
  getMyQuestions,
  getQuestionById
} from '../controllers/question.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createQuestion);
router.get('/', getMyQuestions);
router.get('/:id', getQuestionById);

export default router;
