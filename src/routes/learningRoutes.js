import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { listCourses, createCourse, enroll, myEnrollments, devSeedCourses, getCourse } from '../controllers/learningController.js';

const router = Router();

router.get('/courses', listCourses);
router.get('/courses/:id', getCourse);
router.post('/courses', authenticate, requireRole('trainer', 'admin'), createCourse);
router.put('/courses/:id', authenticate, requireRole('trainer', 'admin'), (await import('../controllers/learningController.js')).updateCourse || ((req,res)=>res.status(501).json({error:'updateCourse missing'})));
router.delete('/courses/:id', authenticate, requireRole('trainer', 'admin'), (await import('../controllers/learningController.js')).deleteCourse || ((req,res)=>res.status(501).json({error:'deleteCourse missing'})));
router.post('/enroll', authenticate, enroll);
router.get('/me/enrollments', authenticate, myEnrollments);
router.post('/dev-seed', devSeedCourses);
router.get('/dev-seed', devSeedCourses);

export default router;

