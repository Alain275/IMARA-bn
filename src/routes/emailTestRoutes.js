import express from 'express';
import { EmailTypes, getEmailProviderStatus, renderTemplateEmail, sendEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/send-test', async (req, res) => {
  try {
    const { email, name = 'SmartFarmX User' } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });
    const ok = await EmailTypes.welcome(email, name, undefined);
    res.json({ success: !!ok, message: ok ? 'Email sent ✅' : 'Email failed ❌' });
  } catch (e) {
    res.status(500).json({ error: 'Send failed', details: e.message });
  }
});

router.get('/provider-status', (_req, res) => {
  res.json(getEmailProviderStatus());
});

router.post('/preview-template', async (req, res) => {
  try {
    const { templateKey, variables = {} } = req.body || {};
    if (!templateKey) return res.status(400).json({ error: 'templateKey is required' });
    const html = renderTemplateEmail(templateKey, variables);
    return res.json({ templateKey, html });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

router.post('/send-template-test', async (req, res) => {
  try {
    const { email, templateKey, variables = {}, subject } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });
    if (!templateKey) return res.status(400).json({ error: 'templateKey is required' });
    const html = renderTemplateEmail(templateKey, variables);
    const ok = await sendEmail({
      to: email,
      subject: subject || `IMARA template test: ${templateKey}`,
      html,
      category: 'system',
      trigger: `template_test_${templateKey}`,
    });
    return res.json({ success: !!ok });
  } catch (e) {
    return res.status(500).json({ error: 'Send failed', details: e.message });
  }
});

export default router;
