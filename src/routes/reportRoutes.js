import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { kpis, sensorCsv, aiSummary, aiDoc, aiPdf, kpisPublic, aiSummaryPublic, aiDocPublic, aiPdfPublic, sensorCsvPublic } from '../controllers/reportController.js';

const router = Router();

router.get('/kpis', authenticate, kpis);
router.get('/sensor-csv', authenticate, sensorCsv);
router.get('/ai-summary', authenticate, aiSummary);
router.get('/ai-doc', authenticate, aiDoc);
router.get('/ai-pdf', authenticate, aiPdf);

// Public analytics for demo/testing
router.get('/public/kpis', kpisPublic);
router.get('/public/sensor-csv', sensorCsvPublic);
router.get('/public/ai-summary', aiSummaryPublic);
router.get('/public/ai-doc', aiDocPublic);
router.get('/public/ai-pdf', aiPdfPublic);

export default router;

