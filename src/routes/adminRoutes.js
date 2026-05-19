import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { adminListUsers, adminUpdateUser, adminDeleteUser, adminCreateUser, adminExportUsersCsv, adminExportUsersPdf } from '../controllers/userController.js';
import { adminGetPrediction, adminListPredictions, adminPredictionStats } from '../controllers/adminPredictionController.js';
import { adminListAssignableUsers, adminListDevices, adminUpdateDeviceAccess } from '../controllers/adminDeviceController.js';
import {
  adminDeleteEmail,
  adminEmailAnalytics,
  adminListEmailTemplates,
  adminListEmails,
  adminPreviewEmailTemplate,
  adminResendEmail,
  adminSendEmail,
} from '../controllers/adminEmailController.js';
import { adminListNotifications, adminMarkNotificationRead } from '../controllers/adminNotificationController.js';
import { adminGlobalSearch } from '../controllers/adminSearchController.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/users', adminListUsers);
router.post('/users', adminCreateUser);
router.put('/users/:id', adminUpdateUser);
router.delete('/users/:id', adminDeleteUser);
router.get('/users/export/csv', adminExportUsersCsv);
router.get('/users/export/pdf', adminExportUsersPdf);

router.get('/predictions/stats', adminPredictionStats);
router.get('/predictions', adminListPredictions);
router.get('/predictions/:id', adminGetPrediction);

router.get('/devices', adminListDevices);
router.get('/users/assignable', adminListAssignableUsers);
router.put('/devices/:id/access', adminUpdateDeviceAccess);

router.get('/emails', adminListEmails);
router.get('/emails/templates', adminListEmailTemplates);
router.post('/emails/preview', adminPreviewEmailTemplate);
router.get('/emails/analytics', adminEmailAnalytics);
router.post('/emails/send', adminSendEmail);
router.post('/emails/:id/resend', adminResendEmail);
router.delete('/emails/:id', adminDeleteEmail);

router.get('/notifications', adminListNotifications);
router.patch('/notifications/:id/read', adminMarkNotificationRead);

router.get('/search', adminGlobalSearch);

export default router;



