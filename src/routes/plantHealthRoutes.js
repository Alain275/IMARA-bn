import express from 'express';
import multer from 'multer';
import { optionalAuthenticate } from '../middleware/authMiddleware.js';
import { predictPlantHealth } from '../controllers/plantHealthController.js';
import { plantHealthLimiter } from '../middleware/rateLimiter.js';

// Configure multer with memory storage and file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = express.Router();

// Accept both `image` (legacy web) and `file` (mobile / unified convention).
router.post(
  '/predict',
  plantHealthLimiter,
  optionalAuthenticate,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  predictPlantHealth
);

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

export default router;
