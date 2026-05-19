import { Router } from 'express';
import { ingest, recent, series, summary, control, recentPublic, seriesPublic, controlPublic } from '../controllers/iotController.js';
import {
  firebaseRecent,
  firebaseRecentPublic,
  greenhouseSnapshot,
  greenhouseHistory,
  greenhouseSyncStatus,
  greenhouseThresholds,
  greenhouseUpdateThresholds,
  greenhouseUpdateMode,
  greenhouseUpdateActuators
} from '../controllers/iotFirebaseController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireDeviceAccess } from '../middleware/deviceAccess.js';

const router = Router();

// Ingest sensor data via HTTP (alternative to MQTT)
router.post('/ingest', authenticate, ingest);
// Device-originated HTTP ingest (when token provided) can be allowed without user auth if needed
// Keep user-auth required for now. For purely device auth, expose a separate route without authenticate.

// Read sensor data (secured for now; can relax later)
router.get('/recent', authenticate, recent);
router.get('/series', authenticate, series);
router.get('/summary', authenticate, summary);
router.post('/control', authenticate, control);
router.get('/firebase/recent', authenticate, firebaseRecent);
router.get('/public/firebase/recent', firebaseRecentPublic);
router.get('/greenhouse/snapshot', authenticate, requireDeviceAccess({ queryKey: 'deviceId', defaultDeviceId: 'greenhouse_01' }), greenhouseSnapshot);
router.get('/greenhouse/history', authenticate, requireDeviceAccess({ queryKey: 'deviceId', defaultDeviceId: 'greenhouse_01' }), greenhouseHistory);
router.get('/greenhouse/sync-status', authenticate, requireDeviceAccess({ queryKey: 'deviceId', defaultDeviceId: 'greenhouse_01' }), greenhouseSyncStatus);
router.get('/greenhouse/thresholds', authenticate, requireDeviceAccess({ queryKey: 'deviceId', defaultDeviceId: 'greenhouse_01' }), greenhouseThresholds);
router.patch(
  '/greenhouse/thresholds',
  authenticate,
  requireDeviceAccess({ queryKey: 'deviceId', defaultDeviceId: 'greenhouse_01' }),
  greenhouseUpdateThresholds,
);
router.patch(
  '/greenhouse/mode',
  authenticate,
  requireDeviceAccess({ queryKey: 'deviceId', defaultDeviceId: 'greenhouse_01' }),
  greenhouseUpdateMode,
);
router.patch(
  '/greenhouse/actuators',
  authenticate,
  requireDeviceAccess({ queryKey: 'deviceId', defaultDeviceId: 'greenhouse_01' }),
  greenhouseUpdateActuators,
);

// Public test/demo endpoints (no auth, require deviceId)
router.get('/public/recent', recentPublic);
router.get('/public/series', seriesPublic);
router.post('/public/control', controlPublic);

export default router;



