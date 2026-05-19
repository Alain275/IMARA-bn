import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { listSensors, getSensor, createSensor, updateSensor, deleteSensor, regenerateToken, claimSensor } from '../controllers/sensorController.js';

const router = Router();

router.get('/', authenticate, listSensors);
router.get('/:id', authenticate, getSensor);
router.post('/', authenticate, createSensor);
router.put('/:id', authenticate, updateSensor);
router.delete('/:id', authenticate, deleteSensor);
router.post('/:id/regenerate-token', authenticate, regenerateToken);
router.post('/claim', authenticate, claimSensor);

export default router;


