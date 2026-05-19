import mongoose from 'mongoose';
import { EmailLog } from '../models/EmailLog.js';
import { User } from '../models/User.js';
import { AdminNotification } from '../models/AdminNotification.js';
import { getEmailProviderStatus, renderTemplateEmail, sendEmail } from '../services/emailService.js';
import { enqueueEmailJob, isEmailQueueAvailable } from '../services/emailQueueService.js';
import { templateCatalog } from '../services/emailTemplateSystem.js';
import { logAdminAction } from '../services/adminAuditService.js';

async function createNotification({ title, message, priority = 'medium', type = 'email', metadata = {} }) {
  await AdminNotification.create({ title, message, priority, type, metadata });
}

export async function adminSendEmail(req, res) {
  const {
    to,
    toUserIds = [],
    subject,
    html,
    templateKey,
    variables = {},
    category = 'system',
    status = 'sent',
    scheduledFor,
  } = req.body || {};

  if (!subject) return res.status(400).json({ error: 'subject is required' });
  if (!html && !templateKey) return res.status(400).json({ error: 'html or templateKey is required' });

  const targets = new Set();
  if (to) targets.add(String(to).trim().toLowerCase());

  const validUserIds = (Array.isArray(toUserIds) ? toUserIds : [])
    .map((x) => String(x))
    .filter((x) => mongoose.Types.ObjectId.isValid(x));
  if (validUserIds.length) {
    const users = await User.find({ _id: { $in: validUserIds } }, { _id: 1, email: 1 }).lean();
    users.forEach((u) => u.email && targets.add(String(u.email).toLowerCase()));
  }

  if (!targets.size) return res.status(400).json({ error: 'No recipients' });
  if (templateKey) {
    try {
      renderTemplateEmail(templateKey, variables);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  const rows = [];
  for (const recipient of targets) {
    let sent = false;
    let failedReason = null;
    const renderedHtml = templateKey
      ? renderTemplateEmail(templateKey, {
          ...variables,
          recipientEmail: recipient,
        })
      : html;
    const queueMode = status === 'sent' && isEmailQueueAvailable();

    const row = await EmailLog.create({
      to: recipient,
      subject,
      html: renderedHtml,
      category,
      status:
        status === 'draft'
          ? 'draft'
          : status === 'scheduled'
            ? 'scheduled'
            : queueMode
              ? 'queued'
              : sent
                ? 'sent'
                : 'failed',
      failedReason,
      senderAdminId: req.user.id,
      scheduledFor: status === 'scheduled' ? new Date(scheduledFor || Date.now()) : undefined,
      sentAt: sent ? new Date() : undefined,
      trigger: templateKey || 'admin_manual',
      templateKey: templateKey || undefined,
    });
    rows.push(row);

    if (status === 'scheduled' || queueMode) {
      const delayMs =
        status === 'scheduled' && scheduledFor
          ? Math.max(0, new Date(scheduledFor).getTime() - Date.now())
          : 0;
      const payload = {
        to: recipient,
        subject,
        html: renderedHtml,
        category,
        senderAdminId: req.user.id,
        trigger: templateKey || 'admin_manual',
      };
      const job = await enqueueEmailJob({ emailLogId: row._id.toString(), payload, delayMs });
      if (!job && status !== 'draft') {
        const ok = await sendEmail({ ...payload, skipEmailLog: true });
        await EmailLog.findByIdAndUpdate(row._id, {
          $set: {
            status: ok ? 'sent' : 'failed',
            failedReason: ok ? null : 'Email provider rejected message',
            sentAt: ok ? new Date() : undefined,
          },
        });
      }
    } else if (status === 'sent') {
      sent = await sendEmail({
        to: recipient,
        subject,
        html: renderedHtml,
        category,
        senderAdminId: req.user.id,
        trigger: templateKey || 'admin_manual',
        skipEmailLog: true,
      });
      if (!sent) failedReason = 'Email provider rejected message';
      await EmailLog.findByIdAndUpdate(row._id, {
        $set: {
          status: sent ? 'sent' : 'failed',
          failedReason: sent ? null : failedReason,
          sentAt: sent ? new Date() : undefined,
        },
      });
    }

    if (!sent && status === 'sent') {
      await createNotification({
        title: 'Email delivery failed',
        message: `Failed to deliver "${subject}" to ${recipient}`,
        priority: 'high',
        metadata: { emailLogId: row._id, recipient },
      });
    }
  }

  await logAdminAction(req, {
    action: 'email_send',
    resourceType: 'email',
    details: { recipients: targets.size, category, subject, status, templateKey: templateKey || null },
  });

  return res.status(201).json({ sent: rows.length, rows });
}

export async function adminListEmails(req, res) {
  const { q, status, category, page = 1, limit = 30 } = req.query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 30));
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (status) query.status = String(status);
  if (category) query.category = String(category);
  if (q) {
    const text = String(q).trim();
    query.$or = [
      { to: { $regex: text, $options: 'i' } },
      { subject: { $regex: text, $options: 'i' } },
      { trigger: { $regex: text, $options: 'i' } },
    ];
  }

  const [total, rows] = await Promise.all([
    EmailLog.countDocuments(query),
    EmailLog.find(query)
      .populate('senderAdminId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  return res.json({ page: pageNum, limit: limitNum, total, rows });
}

export async function adminDeleteEmail(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(String(id))) return res.status(400).json({ error: 'Invalid email id' });
  const row = await EmailLog.findByIdAndDelete(id).lean();
  if (!row) return res.status(404).json({ error: 'Not found' });

  await logAdminAction(req, {
    action: 'email_delete',
    resourceType: 'email',
    resourceId: id,
    details: { to: row.to, subject: row.subject },
  });
  return res.json({ ok: true });
}

export async function adminResendEmail(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(String(id))) return res.status(400).json({ error: 'Invalid email id' });
  const row = await EmailLog.findById(id).lean();
  if (!row) return res.status(404).json({ error: 'Not found' });

  const ok = await sendEmail({
    to: row.to,
    subject: row.subject,
    html: row.html || '<p>No body provided</p>',
    skipEmailLog: true,
    category: row.category || 'system',
    senderAdminId: req.user.id,
    trigger: row.trigger || 'admin_manual_resend',
  });
  const updated = await EmailLog.findByIdAndUpdate(
    id,
    {
      $set: {
        status: ok ? 'sent' : 'failed',
        failedReason: ok ? null : 'Resend failed',
        sentAt: ok ? new Date() : row.sentAt,
      },
    },
    { new: true },
  ).lean();

  if (!ok) {
    await createNotification({
      title: 'Email resend failed',
      message: `Failed to resend "${row.subject}" to ${row.to}`,
      priority: 'high',
      metadata: { emailLogId: row._id },
    });
  }

  await logAdminAction(req, {
    action: 'email_resend',
    resourceType: 'email',
    resourceId: id,
    details: { to: row.to, success: ok },
  });

  return res.json(updated);
}

export async function adminListEmailTemplates(_req, res) {
  return res.json({
    provider: getEmailProviderStatus(),
    templates: templateCatalog,
  });
}

export async function adminPreviewEmailTemplate(req, res) {
  const { templateKey, variables = {} } = req.body || {};
  if (!templateKey) return res.status(400).json({ error: 'templateKey is required' });
  try {
    const html = renderTemplateEmail(templateKey, variables);
    return res.json({ html, templateKey });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

export async function adminEmailAnalytics(req, res) {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const baseMatch = { createdAt: { $gte: from, $lte: to } };

  const [summary] = await EmailLog.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: null,
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        queued: { $sum: { $cond: [{ $eq: ['$status', 'queued'] }, 1, 0] } },
        scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
        opened: { $sum: { $cond: ['$opened', 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);

  const byCategory = await EmailLog.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byTrigger = await EmailLog.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$trigger', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const total = summary?.total || 0;
  const sent = summary?.sent || 0;
  const failed = summary?.failed || 0;
  const opened = summary?.opened || 0;

  return res.json({
    from,
    to,
    queueAvailable: isEmailQueueAvailable(),
    provider: getEmailProviderStatus(),
    totals: {
      total,
      sent,
      failed,
      queued: summary?.queued || 0,
      scheduled: summary?.scheduled || 0,
      opened,
      deliveryRate: total ? Number(((sent / total) * 100).toFixed(2)) : 0,
      openRate: sent ? Number(((opened / sent) * 100).toFixed(2)) : 0,
      failureRate: total ? Number(((failed / total) * 100).toFixed(2)) : 0,
    },
    byCategory: byCategory.map((x) => ({ category: x._id || 'unknown', count: x.count })),
    topTriggers: byTrigger.map((x) => ({ trigger: x._id || 'unknown', count: x.count })),
  });
}

