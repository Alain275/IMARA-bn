import { Router } from 'express';
import authRoutes from './auth.routes';
import cropsRoutes from './crops.routes';
import diseaseRoutes from './disease.routes';
import weatherRoutes from './weather.routes';
import soilRoutes from './soil.routes';
import marketRoutes from './market.routes';
import trainingRoutes from './training.routes';
import userRoutes from './user.routes';

const router = Router();

// Route modules
router.use('/auth', authRoutes);
router.use('/crops', cropsRoutes);
router.use('/disease', diseaseRoutes);
router.use('/weather', weatherRoutes);
router.use('/soil', soilRoutes);
router.use('/market', marketRoutes);
router.use('/training', trainingRoutes);
router.use('/users', userRoutes);

// API info
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to IMARA API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      crops: '/api/crops',
      disease: '/api/disease',
      weather: '/api/weather',
      soil: '/api/soil',
      market: '/api/market',
      training: '/api/training',
      users: '/api/users'
    }
  });
});

export default router;
