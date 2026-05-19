import { AdminAuditLog } from '../models/AdminAuditLog.js';

export async function logAdminAction(req, { action, resourceType, resourceId, details }) {
  try {
    if (!req?.user?.id) return;
    await AdminAuditLog.create({
      adminUserId: req.user.id,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      details: details || {},
    });
  } catch {
    // Never block request path due to audit write failure.
  }
}

