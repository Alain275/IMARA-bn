import { Router } from 'express';
import {
  getAgronomistProfile,
  updateAgronomistProfile,
  getAssignedFarmers,
  getFarmerDetails,
  createFarmVisit,
  getFarmVisits,
  getFarmVisitById,
  updateFarmVisit,
  createAdvice,
  getAdviceList,
  getAdviceById,
  updateAdvice,
  deleteAdvice,
  getQuestions,
  answerQuestion,
  createTrainingMaterial,
  getTrainingMaterials,
  getTrainingMaterialById,
  updateTrainingMaterial,
  deleteTrainingMaterial
} from '../controllers/agronomist.controller';
import { protectRoute } from '../middleware/protectRoute';
import { restrictTo } from '../middleware/restrictTo';
import { UserRole } from '../models/User';

const router = Router();

router.use(protectRoute);
router.use(restrictTo(UserRole.AGRONOMIST, UserRole.ADMIN));

// Profile
router.get('/profile', getAgronomistProfile);
router.patch('/profile', updateAgronomistProfile);

// Farmers
router.get('/farmers', getAssignedFarmers);
router.get('/farmers/:farmerId', getFarmerDetails);

// Farm Visits
router.post('/farm-visits', createFarmVisit);
router.get('/farm-visits', getFarmVisits);
router.get('/farm-visits/:id', getFarmVisitById);
router.patch('/farm-visits/:id', updateFarmVisit);

// Advice
router.post('/advice', createAdvice);
router.get('/advice', getAdviceList);
router.get('/advice/:id', getAdviceById);
router.patch('/advice/:id', updateAdvice);
router.delete('/advice/:id', deleteAdvice);

// Questions
router.get('/questions', getQuestions);
router.patch('/questions/:id/answer', answerQuestion);

// Training Materials
router.post('/training-materials', createTrainingMaterial);
router.get('/training-materials', getTrainingMaterials);
router.get('/training-materials/:id', getTrainingMaterialById);
router.patch('/training-materials/:id', updateTrainingMaterial);
router.delete('/training-materials/:id', deleteTrainingMaterial);

export default router;
