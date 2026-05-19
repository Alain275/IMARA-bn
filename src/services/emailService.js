import dotenv from 'dotenv';
import mongoose from 'mongoose';
import sgMail from '@sendgrid/mail';
import { EmailLog } from '../models/EmailLog.js';
import { renderEmailTemplateByKey } from './emailTemplateSystem.js';

dotenv.config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const FROM_NAME = process.env.FROM_NAME || 'IMARA';
const REPLY_EMAIL = process.env.REPLY_EMAIL || FROM_EMAIL;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export function getEmailProviderStatus() {
  return {
    provider: 'sendgrid',
    configured: Boolean(SENDGRID_API_KEY && FROM_EMAIL),
    hasApiKey: Boolean(SENDGRID_API_KEY),
    fromEmail: FROM_EMAIL || null,
    replyEmail: REPLY_EMAIL || null,
  };
}

export function renderTemplateEmail(templateKey, variables = {}) {
  return renderEmailTemplateByKey(templateKey, variables);
}

const MAX_LOG_HTML = 500_000;

async function persistOutboundEmail({
  to,
  subject,
  html,
  category,
  recipientUserId,
  senderAdminId,
  trigger,
  ok,
  failedReason,
  providerMessageId,
  skipEmailLog,
}) {
  if (skipEmailLog) return;
  try {
    if (mongoose.connection.readyState !== 1) return;
    await EmailLog.create({
      to: String(to).trim().toLowerCase(),
      subject,
      html: html ? String(html).slice(0, MAX_LOG_HTML) : '',
      category: category || 'system',
      status: ok ? 'sent' : 'failed',
      failedReason: ok ? undefined : failedReason || 'send_failed',
      recipientUserId: recipientUserId || undefined,
      senderAdminId: senderAdminId || undefined,
      trigger: trigger || undefined,
      sentAt: ok ? new Date() : undefined,
      providerMessageId: providerMessageId || undefined,
    });
  } catch (e) {
    console.error('[emailService] EmailLog persist failed:', e.message);
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.skipEmailLog] - Set true when the caller creates its own EmailLog row (e.g. admin composer).
 */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  skipEmailLog = false,
  category = 'system',
  recipientUserId,
  senderAdminId,
  trigger,
}) {
  if (!SENDGRID_API_KEY) {
    console.error('[emailService] ❌ SENDGRID_API_KEY not set in .env file');
    console.error('[emailService] Please add SENDGRID_API_KEY=your_key to your .env file');
    await persistOutboundEmail({
      to,
      subject,
      html,
      category,
      recipientUserId,
      senderAdminId,
      trigger,
      ok: false,
      failedReason: 'SENDGRID_API_KEY not configured',
      skipEmailLog,
    });
    return false;
  }

  if (!FROM_EMAIL) {
    console.error('[emailService] ❌ FROM_EMAIL not set in .env file');
    console.error('[emailService] Please add FROM_EMAIL=your_email@domain.com to your .env file');
    await persistOutboundEmail({
      to,
      subject,
      html,
      category,
      recipientUserId,
      senderAdminId,
      trigger,
      ok: false,
      failedReason: 'FROM_EMAIL not configured',
      skipEmailLog,
    });
    return false;
  }

  console.log(`[emailService] 📧 Attempting to send email to: ${to}`);
  console.log(`[emailService] Subject: ${subject}`);
  console.log(`[emailService] From: ${FROM_EMAIL}`);

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    replyTo: REPLY_EMAIL,
    subject,
    html,
  };
  if (attachments && attachments.length) {
    console.log(`[emailService] 📎 Attachments: ${attachments.length} file(s)`);
    msg.attachments = attachments.map((a) => ({
      content: a.content, // base64 string
      filename: a.filename,
      type: a.type || 'application/octet-stream',
      disposition: 'attachment',
    }));
  }
  try {
    const response = await sgMail.send(msg);
    console.log(`[emailService] ✅ Email sent successfully to: ${to}`);
    console.log(`[emailService] SendGrid response status: ${response[0]?.statusCode}`);
    const providerMessageId = response[0]?.headers?.['x-message-id'] || response[0]?.headers?.['X-Message-Id'];
    await persistOutboundEmail({
      to,
      subject,
      html,
      category,
      recipientUserId,
      senderAdminId,
      trigger,
      ok: true,
      providerMessageId,
      skipEmailLog,
    });
    return true;
  } catch (err) {
    console.error('[emailService] ❌ Failed to send email');
    console.error('[emailService] To:', to);
    console.error('[emailService] Subject:', subject);
    console.error('[emailService] Error details:', err?.response?.body || err?.message || err);
    if (err?.response?.body?.errors) {
      console.error('[emailService] SendGrid errors:', JSON.stringify(err.response.body.errors, null, 2));
    }
    const reason =
      err?.response?.body?.errors?.map((e) => e.message).join('; ') || err?.message || 'SendGrid error';
    await persistOutboundEmail({
      to,
      subject,
      html,
      category,
      recipientUserId,
      senderAdminId,
      trigger,
      ok: false,
      failedReason: reason,
      skipEmailLog,
    });
    return false;
  }
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

export const EmailTypes = {
  welcome: async (email, name, recipientUserId) => {
    const html = renderTemplateEmail('welcome', {
      userName: name,
      dashboardUrl: `${APP_BASE_URL}/dashboard`,
    });
    return sendEmail({
      to: email,
      subject: 'Welcome to IMARA — your smart agriculture workspace 🎉',
      html,
      category: 'account',
      recipientUserId,
      trigger: 'welcome_signup',
    });
  },

  /** Notify user after successful login (security awareness). */
  loginAlert: (email, name, meta = {}) => {
    const when = meta.at instanceof Date ? meta.at.toISOString() : new Date().toISOString();
    const ip = meta.ip ? String(meta.ip) : '';
    return sendEmail({
      to: email,
      subject: 'New sign-in to your IMARA account',
      html: renderTemplateEmail('login_alert', {
        userName: name,
        at: when,
        ip,
        settingsUrl: `${APP_BASE_URL}/settings`,
      }),
      category: 'account',
      recipientUserId: meta.userId,
      trigger: 'login',
    });
  },

  plantHealthResult: (email, name, { label, confidence, recipientUserId }) => {
    let pct = '—';
    if (typeof confidence === 'number' && !Number.isNaN(confidence)) {
      pct = confidence > 1 ? `${Math.round(confidence * 10) / 10}%` : `${Math.round(confidence * 1000) / 10}%`;
    }
    return sendEmail({
      to: email,
      subject: `Plant health analysis: ${label || 'Result ready'}`,
      html: renderTemplateEmail('prediction_complete', {
        userName: name,
        diseaseName: label,
        confidence: pct,
        dashboardUrl: `${APP_BASE_URL}/plant-health`,
      }),
      category: 'ai_notifications',
      recipientUserId,
      trigger: 'plant_diagnosis',
    });
  },

  verification: (email, name, token) => {
    const url = `${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    return sendEmail({
      to: email,
      subject: 'Verify Your Email Address ✅',
      html: renderTemplateEmail('email_verification', {
        userName: name,
        verifyUrl: url,
      }),
      category: 'account',
      trigger: 'email_verification',
    });
  },

  resetPassword: (email, name, token) => {
    const url = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    return sendEmail({
      to: email,
      subject: 'Reset Your Password 🔐',
      html: renderTemplateEmail('password_reset', {
        userName: name,
        resetUrl: url,
      }),
      category: 'account',
      trigger: 'password_reset',
    });
  },

  newDeviceAdded: (email, data, recipientUserId) =>
    sendEmail({
      to: email,
      subject: `New device registered: ${data?.deviceId || ''} ✅`,
      html: `<h3>New device on your account</h3><p><strong>Device:</strong> ${data?.deviceId}</p><p><strong>Name:</strong> ${data?.name || '-'}</p><p><strong>Time:</strong> ${data?.time || new Date().toLocaleString()}</p>`,
      category: 'alerts',
      recipientUserId,
      trigger: 'device_added',
    }),

  deviceOffline: (email, data, recipientUserId) =>
    sendEmail({
      to: email,
      subject: `Device offline — ${data?.deviceId} ⚠️`,
      html: renderTemplateEmail('device_offline', {
        userName: data?.userName || 'User',
        deviceName: data?.deviceId || data?.deviceName,
        lastSeen: data?.lastSeen || 'Unknown',
        devicesUrl: `${APP_BASE_URL}/devices`,
      }),
      category: 'alerts',
      recipientUserId,
      trigger: 'device_offline',
    }),

  pumpFailure: (email, data, recipientUserId) =>
    sendEmail({
      to: email,
      subject: `Pump failure alert — ${data?.deviceId} ❌`,
      html: `<h3>Pump failure</h3><p><strong>Device:</strong> ${data?.deviceId}</p><p><strong>Issue:</strong> ${data?.issue || 'Pump not responding'}</p><p><strong>Time:</strong> ${data?.time || new Date().toLocaleString()}</p>`,
      category: 'alerts',
      recipientUserId,
      trigger: 'pump_failure',
    }),

  marketplaceOrder: (email, order, recipientUserId) =>
    sendEmail({
      to: email,
      subject: `Marketplace order ${order?.orderId || ''} 🛒`,
      html: `<h3>Order confirmation</h3><p><strong>Order ID:</strong> ${order?.orderId}</p><p><strong>Items:</strong> ${(order?.items || []).map((i) => `${i.name} x${i.qty}`).join(', ')}</p><p><strong>Total:</strong> ${order?.total || ''}</p>`,
      category: 'system',
      recipientUserId,
      trigger: 'marketplace_order',
    }),

  learningCertificate: (email, data, recipientUserId) =>
    sendEmail({
      to: email,
      subject: `Your learning certificate 🎓`,
      html: `<h3>Congratulations!</h3><p>You completed: <strong>${data?.course || ''}</strong></p><p>Date: ${data?.date || new Date().toLocaleDateString()}</p>`,
      attachments: data?.attachment
        ? [
            {
              filename: data.attachment.filename,
              content: data.attachment.base64,
              type: data.attachment.type || 'application/pdf',
            },
          ]
        : undefined,
      category: 'newsletters',
      recipientUserId,
      trigger: 'learning_certificate',
    }),

  adminBroadcast: (emails, subject, html) =>
    Promise.all(
      emails.map((to) => sendEmail({ to, subject, html, category: 'marketing', trigger: 'admin_broadcast' })),
    ).then((r) => r.every(Boolean)),

  weeklyFarmReport: async (email, user, reportData, pdfBuffer) => {
    const { generateWeeklyReportEmail } = await import('./emailTemplateService.js');
    const html = await generateWeeklyReportEmail(user, reportData);

    const attachments = pdfBuffer
      ? [
          {
            filename: `imara-weekly-report-${new Date().toISOString().split('T')[0]}.pdf`,
            content: pdfBuffer.toString('base64'),
            type: 'application/pdf',
          },
        ]
      : undefined;

    return sendEmail({
      to: email,
      subject: `Your weekly farm report — ${new Date().toLocaleDateString()} 📊`,
      html,
      attachments,
      category: 'newsletters',
      recipientUserId: user?._id || user?.id,
      trigger: 'weekly_report',
    });
  },

  irrigationAlert: async (email, user, alertData) => {
    const { generateIrrigationAlertEmail } = await import('./emailTemplateService.js');
    const html = await generateIrrigationAlertEmail(user, alertData);
    return sendEmail({
      to: email,
      subject: '🚨 Irrigation alert: low soil moisture',
      html,
      category: 'alerts',
      recipientUserId: user?._id || user?.id,
      trigger: 'irrigation_alert',
    });
  },

  monthlyPerformancePdf: (email, htmlContent, pdfAttachment, recipientUserId) =>
    sendEmail({
      to: email,
      subject: 'Monthly performance report 📄',
      html: htmlContent || '<p>See attached report.</p>',
      attachments: pdfAttachment
        ? [
            {
              filename: pdfAttachment.filename || 'imara-report.pdf',
              content: pdfAttachment.base64,
              type: 'application/pdf',
            },
          ]
        : undefined,
      category: 'newsletters',
      recipientUserId,
      trigger: 'monthly_report',
    }),

  custom: (email, subject, html, attachments) =>
    sendEmail({ to: email, subject, html, attachments, category: 'system', trigger: 'custom' }),
};
