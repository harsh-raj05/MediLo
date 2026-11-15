import { AuditLog } from '../models/AuditLog.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { withSession } from '../utils/tx.js';

export const recordAudit = async (
  { actor = null, action, entityType, entityId = null, summary, metadata = {} },
  session = null
) => {
  const doc = {
    actorId: actor?._id || null,
    actorEmail: actor?.email || 'system',
    actorRole: actor?.role || 'system',
    action,
    entityType,
    entityId: entityId ? String(entityId) : null,
    summary,
    metadata,
  };
  await AuditLog.create([doc], withSession(session));
};

export const listAuditLogs = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.search) {
    const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ summary: regex }, { actorEmail: regex }, { action: regex }];
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(total, page, limit) };
};
