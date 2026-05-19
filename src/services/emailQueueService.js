import { Queue, Worker } from 'bullmq';
import logger from './logger.js';
import { EmailLog } from '../models/EmailLog.js';
import { sendEmail } from './emailService.js';

const QUEUE_NAME = 'email-outbound';
const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};

let emailQueue = null;
let worker = null;
let available = false;

export function initEmailQueue() {
  const queueEnabled = String(process.env.EMAIL_QUEUE_ENABLED || '').toLowerCase();
  const hasExplicitRedis = Boolean(process.env.REDIS_URL);
  if (queueEnabled === 'false' || (!hasExplicitRedis && queueEnabled !== 'true')) {
    available = false;
    logger.info('[email-queue] disabled (set EMAIL_QUEUE_ENABLED=true with REDIS_URL to enable)');
    return;
  }
  try {
    emailQueue = new Queue(QUEUE_NAME, { connection });
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const { emailLogId, payload } = job.data || {};
        if (!payload?.to || !payload?.subject || !payload?.html) {
          throw new Error('Invalid email payload');
        }

        if (emailLogId) {
          await EmailLog.findByIdAndUpdate(emailLogId, {
            $set: { status: 'queued', failedReason: null },
          });
        }

        const ok = await sendEmail({
          ...payload,
          skipEmailLog: true,
        });

        if (emailLogId) {
          await EmailLog.findByIdAndUpdate(emailLogId, {
            $set: {
              status: ok ? 'sent' : 'failed',
              sentAt: ok ? new Date() : undefined,
              failedReason: ok ? null : 'Delivery failed in queue worker',
            },
          });
        }

        if (!ok) throw new Error('Provider rejected email');
        return { ok: true };
      },
      {
        connection,
        concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY || 3),
      },
    );

    worker.on('failed', (job, err) => {
      logger.error(`[email-queue] job ${job?.id || 'unknown'} failed: ${err.message}`);
    });
    worker.on('completed', (job) => {
      logger.info(`[email-queue] job ${job.id} completed`);
    });
    worker.on('error', (err) => {
      logger.error(`[email-queue] worker error: ${err.message}`);
      available = false;
      // Prevent noisy reconnect loops when Redis is down.
      Promise.resolve(worker?.close()).catch(() => {});
      worker = null;
    });

    available = true;
    logger.info('[email-queue] initialized');
  } catch (e) {
    available = false;
    logger.warn(`[email-queue] unavailable, falling back to direct send: ${e.message}`);
  }
}

export function isEmailQueueAvailable() {
  return available && !!emailQueue;
}

export async function enqueueEmailJob({ emailLogId, payload, delayMs = 0 }) {
  if (!isEmailQueueAvailable()) return null;
  return emailQueue.add(
    'send',
    { emailLogId, payload },
    {
      attempts: Number(process.env.EMAIL_QUEUE_RETRIES || 3),
      backoff: {
        type: 'exponential',
        delay: Number(process.env.EMAIL_QUEUE_BACKOFF_MS || 2000),
      },
      removeOnComplete: true,
      removeOnFail: false,
      delay: Math.max(0, Number(delayMs) || 0),
    },
  );
}

export async function closeEmailQueue() {
  try {
    if (worker) await worker.close();
    if (emailQueue) await emailQueue.close();
  } catch (e) {
    logger.warn(`[email-queue] close warning: ${e.message}`);
  }
}
