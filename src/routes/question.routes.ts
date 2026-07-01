import { Router } from 'express';
import {
  createQuestion,
  getMyQuestions,
  getQuestionById
} from '../controllers/question.controller';
import { protectRoute } from '../middleware/protectRoute';

const router = Router();

router.use(protectRoute);

router.post('/', createQuestion);
router.get('/', getMyQuestions);
router.get('/:id', getQuestionById);

export default router;
