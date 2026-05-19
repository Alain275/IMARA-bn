import express from 'express';
import { 
  createDeviceRequest, 
  getAllDeviceRequests, 
  getDeviceRequest, 
  updateDeviceRequestStatus, 
  deleteDeviceRequest 
} from '../controllers/deviceRequestController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public route - anyone can submit a device request
router.post('/', createDeviceRequest);

// Admin routes - require authentication and admin role
router.get('/', authenticate, requireRole(['admin']), getAllDeviceRequests);
router.get('/:id', authenticate, requireRole(['admin']), getDeviceRequest);
router.put('/:id', authenticate, requireRole(['admin']), updateDeviceRequestStatus);
router.delete('/:id', authenticate, requireRole(['admin']), deleteDeviceRequest);

export default router;
