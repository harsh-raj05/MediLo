import { env } from '../config/env.js';
import { Batch } from '../models/Batch.js';
import { Medicine } from '../models/Medicine.js';
import { StockMovement } from '../models/StockMovement.js';
import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { runInTransaction, withSession } from '../utils/tx.js';
import { recordAudit } from './auditService.js';

export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const calculateLinePricing = (quantity, unitPrice, taxRatePct) => {
  const lineSubtotal = roundMoney(quantity * unitPrice);
  const lineTax = roundMoney(lineSubtotal * (taxRatePct / 100));
  const lineTotal = roundMoney(lineSubtotal + lineTax);
  return { lineSubtotal, lineTax, lineTotal };
};

/**
 * Pure FEFO (First-Expiry-First-Out) batch allocation planner.
 * Filters out expired, non-active, and empty batches, then allocates
 * across ascending expiry dates.
 */
export const computeFefoPlan = (batches, requestedQuantity, now = new Date()) => {
  const eligible = batches
    .filter((b) => b.status === 'active' && b.quantityOnHand > 0 && new Date(b.expiryDate) > now)
    .sort((a, b) => {
      const expDiff = new Date(a.expiryDate) - new Date(b.expiryDate);
      if (expDiff !== 0) return expDiff;
      return new Date(a.receivedAt || a.createdAt || 0) - new Date(b.receivedAt || b.createdAt || 0);
    });

  let remaining = requestedQuantity;
  const allocated = [];

  for (const batch of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityOnHand, remaining);
    allocated.push({ batch, quantity: take });
    remaining -= take;
  }

  return {
    allocated,
    remainingUnfulfilled: remaining,
    totalAvailable: eligible.reduce((sum, b) => sum + b.quantityOnHand, 0),
  };
};

export const listBatches = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const now = new Date();
  const nearExpiryCutoff = new Date(now.getTime() + env.nearExpiryDays * 24 * 60 * 60 * 1000);
  const filter = {};

  if (query.medicineId) filter.medicineId = query.medicineId;
  if (query.status) filter.status = query.status;
  if (query.expiryFilter === 'expired') {
    filter.$or = [{ expiryDate: { $lte: now } }, { status: 'expired' }];
  } else if (query.expiryFilter === 'near_expiry') {
    filter.expiryDate = { $gt: now, $lte: nearExpiryCutoff };
    filter.quantityOnHand = { $gt: 0 };
    filter.status = 'active';
  } else if (query.expiryFilter === 'sellable') {
    filter.expiryDate = { $gt: now };
    filter.quantityOnHand = { $gt: 0 };
    filter.status = 'active';
  }

  if (query.search) {
    const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const medMatches = await Medicine.find({ $or: [{ name: regex }, { sku: regex }] }).select('_id').lean();
    const medIds = medMatches.map((m) => m._id);
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ batchNumber: regex }, { medicineId: { $in: medIds } }] },
    ];
  }

  const [rows, total] = await Promise.all([
    Batch.find(filter)
      .populate('medicineId', 'sku name genericName dosageForm strength reorderLevel taxRatePct')
      .populate('supplierId', 'name code')
      .sort({ expiryDate: 1, receivedAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Batch.countDocuments(filter),
  ]);

  const items = rows.map((b) => {
    const exp = new Date(b.expiryDate);
    const isExpired = exp <= now || b.status === 'expired';
    const isNearExpiry = !isExpired && b.status === 'active' && b.quantityOnHand > 0 && exp <= nearExpiryCutoff;
    return {
      ...b,
      medicine: b.medicineId,
      supplier: b.supplierId,
      isExpired,
      isNearExpiry,
    };
  });

  return { items, pagination: buildPaginationMeta(total, page, limit) };
};

export const getInventoryAlerts = async (nearExpiryDays = env.nearExpiryDays) => {
  const now = new Date();
  const cutoff = new Date(now.getTime() + nearExpiryDays * 24 * 60 * 60 * 1000);

  const [medicines, batches] = await Promise.all([
    Medicine.find({ isActive: true }).populate('categoryId', 'name').lean(),
    Batch.find({ quantityOnHand: { $gt: 0 } })
      .populate('medicineId', 'sku name genericName reorderLevel')
      .populate('supplierId', 'name code')
      .sort({ expiryDate: 1 })
      .lean(),
  ]);

  const sellableByMed = new Map();
  const nearExpiryBatches = [];
  const expiredBatches = [];

  for (const b of batches) {
    const exp = new Date(b.expiryDate);
    const medId = String(b.medicineId?._id || b.medicineId);
    const isExpired = exp <= now || b.status === 'expired';

    if (b.status === 'active' && !isExpired) {
      sellableByMed.set(medId, (sellableByMed.get(medId) || 0) + b.quantityOnHand);
      if (exp <= cutoff) {
        const daysRemaining = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        nearExpiryBatches.push({ ...b, daysRemaining });
      }
    } else if (isExpired) {
      expiredBatches.push(b);
    }
  }

  const lowStockMedicines = medicines
    .map((m) => {
      const sellableQuantity = sellableByMed.get(String(m._id)) || 0;
      return {
        _id: m._id,
        sku: m.sku,
        name: m.name,
        category: m.categoryId?.name || 'Uncategorized',
        reorderLevel: m.reorderLevel,
        sellableQuantity,
        deficit: Math.max(0, m.reorderLevel - sellableQuantity),
      };
    })
    .filter((m) => m.sellableQuantity <= m.reorderLevel)
    .sort((a, b) => a.sellableQuantity - b.sellableQuantity);

  return {
    nearExpiryDays,
    summary: {
      lowStockCount: lowStockMedicines.length,
      nearExpiryCount: nearExpiryBatches.length,
      expiredOnHandCount: expiredBatches.length,
    },
    lowStockMedicines,
    nearExpiryBatches,
    expiredBatches,
  };
};

export const adjustBatchStock = async ({ batchId, delta, adjustmentType, reason, actor }) => {
  if (!delta || delta === 0) {
    throw new AppError(400, 'INVALID_ADJUSTMENT', 'Quantity delta must be non-zero');
  }
  if (!reason || reason.trim().length < 5) {
    throw new AppError(400, 'REASON_REQUIRED', 'A descriptive reason (at least 5 characters) is required for stock adjustments');
  }

  return runInTransaction(async (session) => {
    const now = new Date();
    const existing = await Batch.findById(batchId, null, withSession(session));
    if (!existing) {
      throw new AppError(404, 'BATCH_NOT_FOUND', 'Batch not found');
    }

    let updated;
    if (delta < 0) {
      const deduct = Math.abs(delta);
      updated = await Batch.findOneAndUpdate(
        { _id: batchId, quantityOnHand: { $gte: deduct } },
        { $inc: { quantityOnHand: -deduct } },
        { new: true, ...withSession(session) }
      );
      if (!updated) {
        throw new AppError(
          409,
          'INSUFFICIENT_STOCK',
          `Cannot deduct ${deduct} units from batch ${existing.batchNumber}; available quantity is ${existing.quantityOnHand}`
        );
      }
    } else {
      if (new Date(existing.expiryDate) <= now && adjustmentType !== 'AUDIT_CORRECTION') {
        throw new AppError(409, 'BATCH_EXPIRED', 'Cannot add positive sellable stock to an expired batch');
      }
      updated = await Batch.findByIdAndUpdate(
        batchId,
        { $inc: { quantityOnHand: delta } },
        { new: true, ...withSession(session) }
      );
    }

    const balanceAfter = updated.quantityOnHand;
    const balanceBefore = balanceAfter - delta;

    // Sync batch status cleanly
    const isExpired = new Date(updated.expiryDate) <= now;
    let nextStatus = updated.status;
    if (adjustmentType === 'QUARANTINE') {
      nextStatus = 'quarantined';
    } else if (isExpired) {
      nextStatus = 'expired';
    } else if (balanceAfter === 0) {
      nextStatus = 'depleted';
    } else if (updated.status === 'depleted') {
      nextStatus = 'active';
    }

    if (nextStatus !== updated.status) {
      updated.status = nextStatus;
      await updated.save(withSession(session));
    }

    const movementType = delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    const refCode = `ADJ-${Date.now().toString(36).toUpperCase()}`;

    const [movement] = await StockMovement.create(
      [
        {
          medicineId: updated.medicineId,
          batchId: updated._id,
          batchNumber: updated.batchNumber,
          movementType,
          quantityDelta: delta,
          balanceBefore,
          balanceAfter,
          unitCost: updated.purchasePrice,
          referenceType: 'ADJUSTMENT',
          referenceId: updated._id,
          referenceCode: refCode,
          reason: `[${adjustmentType || 'CORRECTION'}] ${reason.trim()}`,
          performedBy: actor._id,
        },
      ],
      withSession(session)
    );

    await recordAudit(
      {
        actor,
        action: 'STOCK_ADJUSTED',
        entityType: 'Batch',
        entityId: updated._id,
        summary: `Adjusted batch ${updated.batchNumber} by ${delta > 0 ? '+' : ''}${delta} (${balanceBefore} -> ${balanceAfter}). Reason: ${reason.trim()}`,
        metadata: { movementType, delta, balanceBefore, balanceAfter, adjustmentType, reason: reason.trim() },
      },
      session
    );

    return { batch: updated, movement };
  });
};

export const listStockMovements = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.medicineId) filter.medicineId = query.medicineId;
  if (query.batchId) filter.batchId = query.batchId;
  if (query.movementType) filter.movementType = query.movementType;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .populate('medicineId', 'sku name strength')
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StockMovement.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(total, page, limit) };
};
