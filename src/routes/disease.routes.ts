import { Router } from 'express';
import multer from 'multer';
import {
  getDiseaseDetections,
  getPendingDetections,
  getDiseaseById,
  createDiseaseDetection,
  updateDiseaseDetection,
  deleteDiseaseDetection,
  getDiseaseStats,
  detectDiseaseFromImage,
  verifyDiseaseDetection
} from '../controllers/disease.controller';
import { protectRoute } from '../middleware/protectRoute';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.use(protectRoute);

// Map root and /my-detections to the same controller method
router.get('/', getDiseaseDetections);
router.get('/my-detections', getDiseaseDetections);

router.get('/pending', getPendingDetections);
router.get('/stats', getDiseaseStats);
router.get('/:id', getDiseaseById);
router.post('/', createDiseaseDetection);

// AI detection route with file upload
router.post('/detect', upload.single('file'), detectDiseaseFromImage);

router.patch('/:id', updateDiseaseDetection);
router.patch('/:id/verify', verifyDiseaseDetection);
router.delete('/:id', deleteDiseaseDetection);

export default router;
