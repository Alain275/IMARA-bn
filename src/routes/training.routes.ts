import { Router } from 'express';
import { 
  getAllCourses,
  getCourseById,
  enrollCourse,
  getUserProgress,
  getAchievements
} from '../controllers/training.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/courses', getAllCourses);
router.get('/courses/:id', getCourseById);
router.post('/courses/:id/enroll', enrollCourse);
router.get('/progress', getUserProgress);
router.get('/achievements', getAchievements);

export default router;
