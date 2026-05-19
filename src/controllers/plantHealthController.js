import FormData from 'form-data';
import { PlantPrediction } from '../models/PlantPrediction.js';
import { DiseaseServiceHttpError, sendPredictionRequest } from '../services/plantDiseaseHttpClient.js';
import { PLANT_DISEASE_API_BASE } from '../services/plantDiseaseHttpClient.js';
import logger from '../services/logger.js';
import { EmailTypes } from '../services/emailService.js';

const FALLBACK_TIMEOUT_MS = Number(process.env.DISEASE_SERVICE_TIMEOUT_MS || 180000);

function isNetworkError(err) {
  if (!err) return false;

  if (err.isAxiosError && !err.response) {
    return true;
  }

  const code = err.code || err.cause?.code;
  if (!code && err.type && err.type === 'system') {
    return true;
  }

  const transientCodes = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ETIMEDOUT',
    'ECONNABORTED',
    'EAI_AGAIN',
  ]);
  return transientCodes.has(code) || err.name === 'AbortError';
}

async function callDiseaseService(formFactory, timeoutMs = FALLBACK_TIMEOUT_MS) {
  try {
    return await sendPredictionRequest(formFactory, { timeoutMs });
  } catch (err) {
    logger.error(`Disease service call failed: ${err.message}`);
    throw err;
  }
}

function createFormData(fileBuffer, filename, mimetype) {
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: filename || 'leaf.jpg',
    contentType: mimetype || 'image/jpeg',
  });
  return form;
}

export async function predictPlantHealth(req, res) {
  try {
    const uploadedFile = req.file || req.files?.file?.[0] || req.files?.image?.[0] || null;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'Image is required' });
    }

    logger.info(`Processing plant health prediction for ${uploadedFile.originalname} (${uploadedFile.size} bytes)`);

    const formFactory = () =>
      createFormData(uploadedFile.buffer, uploadedFile.originalname, uploadedFile.mimetype);
    let result;
    try {
      result = await callDiseaseService(formFactory);
    } catch (err) {
      if (err instanceof DiseaseServiceHttpError) {
        if (err.status === 429) {
          return res.status(503).json({
            error: 'The AI diagnosis service is busy (rate limited). Please wait a few seconds and try again.',
            details: err.body,
          });
        }
        return res.status(502).json({ error: 'Disease service error', details: err.body });
      }

      if (isNetworkError(err)) {
        logger.error('Plant disease service unreachable', err);
        const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(String(PLANT_DISEASE_API_BASE || ''));
        return res.status(503).json({
          error: 'Plant disease service unreachable. Please try again shortly.',
          aiBase: PLANT_DISEASE_API_BASE,
          hint: isLocal
            ? 'AI service is not running locally. Start it with: cd ai-services/python-api && pip install -r requirements.txt && python -m uvicorn app:app --host 127.0.0.1 --port 10000'
            : 'Check DISEASE_API_BASE (or AI_BASE) points to your deployed ai-services/python-api URL (and that the Render service is awake).',
        });
      }
      throw err;
    }

    logger.info(`Plant health prediction successful: ${result.label} (${result.confidence.toFixed(2)})`);

    const payload = {
      label: result.label,
      confidence: result.confidence,
      disease_info: result.disease_info,
    };

    if (req.user?.id) {
      const doc = await PlantPrediction.create({
        userId: req.user.id,
        imageUrl: null,
        label: result.label,
        confidence: result.confidence,
        recommendations: result.disease_info?.recommendations || result.disease_info?.farmer_action || [],
        diseaseInfo: result.disease_info,
        createdAt: new Date(),
      });
      if (req.user.email) {
        EmailTypes.plantHealthResult(req.user.email, req.user.name, {
          label: result.label,
          confidence: result.confidence,
          recipientUserId: req.user.id,
        }).catch(() => {});
      }
      return res.json({ ...payload, id: doc._id, saved: true });
    }

    return res.json({ ...payload, saved: false });
  } catch (err) {
    logger.error('Failed to predict plant health', err);
    return res.status(500).json({ error: 'Failed to predict plant health' });
  }
}
