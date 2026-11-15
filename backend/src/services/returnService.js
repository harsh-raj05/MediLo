import crypto from 'node:crypto';
import { Batch } from '../models/Batch.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { Sale } from '../models/Sale.js';
import { StockMovement } from '../models/StockMovement.js';
import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { runInTransaction, withSession } from '../utils/tx.js';
import { recordAudit } from './auditService.js';
import { calculateLinePricing, roundMoney } from './inventoryService.js';

const generateReturnNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `RET-${datePart}-${rand}`;
};

export const createReturn = async ({ saleId, reason, condition = 'RESTOCKABLE', items, actor }) => {
  if (!reason || reason.trim().length < 5) {
    throw new AppError(400, 'REASON_REQUIRED', 'Return reason (at least 5 characters) is required');
  }

  return runInTransaction(async (session) => {
    const now = new Date();
    const sale = await Sale.findById(saleId, null, withSession(session));
    if (!sale) {
      throw new AppError(404, 'SALE_NOT_FOUND', 'Original sale invoice not found');
    }

    const returnNumber = generateReturnNumber();
    const returnItems = [];
    const movements = [];
    let totalRefund = 0;

    for (const reqItem of items) {
      const saleItem = sale.items.find((si) => String(si.medicineId) === String(reqItem.medicineId));
      if (!saleItem) {
        throw new AppError(400, 'INVALID_RETURN_ITEM', `Medicine ${reqItem.medicineId} was not part of invoice ${sale.invoiceNumber}`);
      }

      const allocation = saleItem.allocations.find((a) => String(a.batchId) === String(reqItem.batchId));
      if (!allocation) {
        throw new AppError(
          400,
          'INVALID_RETURN_BATCH',
          `Batch ${reqItem.batchId} was not allocated on invoice ${sale.invoiceNumber}`
        );
      }

      const returnableQty = allocation.quantity - allocation.returnedQuantity;
      if (reqItem.quantity > returnableQty) {
        throw new AppError(
          409,
          'RETURN_EXCEEDS_SOLD',
          `Cannot return ${reqItem.quantity} units of ${saleItem.medicineName} (batch ${allocation.batchNumber}); only ${returnableQty} unit(s) remain returnable`
        );
      }

      const batch = await Batch.findById(allocation.batchId, null, withSession(session));
      if (!batch) {
        throw new AppError(404, 'BATCH_NOT_FOUND', 'Original batch no longer exists');
      }

      const restocked = condition === 'RESTOCKABLE';
      if (restocked && (new Date(batch.expiryDate) <= now || batch.status === 'expired')) {
        throw new AppError(
          409,
          'CANNOT_RESTOCK_EXPIRED',
          `Batch ${batch.batchNumber} is expired and cannot be restocked as sellable inventory. Use condition DAMAGED.`
        );
      }

      allocation.returnedQuantity += reqItem.quantity;
      saleItem.returnedQuantity += reqItem.quantity;

      const pricing = calculateLinePricing(reqItem.quantity, allocation.unitPrice, saleItem.taxRatePct);
      totalRefund = roundMoney(totalRefund + pricing.lineTotal);

      const balanceBefore = batch.quantityOnHand;

      if (restocked) {
        batch.quantityOnHand += reqItem.quantity;
        if (batch.status === 'depleted') batch.status = 'active';
        await batch.save(withSession(session));

        movements.push({
          medicineId: saleItem.medicineId,
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          movementType: 'SALE_RETURN',
          quantityDelta: reqItem.quantity,
          balanceBefore,
          balanceAfter: batch.quantityOnHand,
          unitCost: allocation.unitCost,
          referenceType: 'RETURN',
          referenceId: sale._id,
          referenceCode: returnNumber,
          reason: `Customer return restocked (${sale.invoiceNumber}): ${reason.trim()}`,
          performedBy: actor._id,
        });
      } else {
        // Damaged return: record SALE_RETURN (+qty) and immediate ADJUSTMENT_OUT (-qty)
        // so sellable batch balance remains unchanged and stock reconciliation stays exact.
        const interimBalance = balanceBefore + reqItem.quantity;
        movements.push(
          {
            medicineId: saleItem.medicineId,
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            movementType: 'SALE_RETURN',
            quantityDelta: reqItem.quantity,
            balanceBefore,
            balanceAfter: interimBalance,
            unitCost: allocation.unitCost,
            referenceType: 'RETURN',
            referenceId: sale._id,
            referenceCode: returnNumber,
            reason: `Damaged return received (${sale.invoiceNumber}): ${reason.trim()}`,
            performedBy: actor._id,
          },
          {
            medicineId: saleItem.medicineId,
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            movementType: 'ADJUSTMENT_OUT',
            quantityDelta: -reqItem.quantity,
            balanceBefore: interimBalance,
            balanceAfter: balanceBefore,
            unitCost: allocation.unitCost,
            referenceType: 'RETURN',
            referenceId: sale._id,
            referenceCode: returnNumber,
            reason: `Damaged return write-off (${sale.invoiceNumber}): ${reason.trim()}`,
            performedBy: actor._id,
          }
        );
      }

      returnItems.push({
        medicineId: saleItem.medicineId,
        medicineName: saleItem.medicineName,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        quantity: reqItem.quantity,
        unitPrice: allocation.unitPrice,
        taxRatePct: saleItem.taxRatePct,
        refundSubtotal: pricing.lineSubtotal,
        refundTax: pricing.lineTax,
        refundTotal: pricing.lineTotal,
        restocked,
      });
    }

    const allReturned = sale.items.every((si) => si.returnedQuantity >= si.requestedQuantity);
    sale.status = allReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';
    await sale.save(withSession(session));

    const [returnRecord] = await ReturnRecord.create(
      [
        {
          returnNumber,
          saleId: sale._id,
          invoiceNumber: sale.invoiceNumber,
          reason: reason.trim(),
          condition,
          items: returnItems,
          totalRefund,
          processedBy: actor._id,
        },
      ],
      withSession(session)
    );

    for (const m of movements) {
      m.referenceId = returnRecord._id;
    }
    if (movements.length > 0) {
      await StockMovement.insertMany(movements, { ...withSession(session), ordered: true });
    }

    await recordAudit(
      {
        actor,
        action: 'SALE_RETURN_PROCESSED',
        entityType: 'ReturnRecord',
        entityId: returnRecord._id,
        summary: `Processed ${condition.toLowerCase()} return ${returnNumber} for ${sale.invoiceNumber}, refund ${totalRefund}. Reason: ${reason.trim()}`,
        metadata: { returnNumber, invoiceNumber: sale.invoiceNumber, condition, totalRefund, reason: reason.trim() },
      },
      session
    );

    return returnRecord;
  });
};

export const listReturns = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.saleId) filter.saleId = query.saleId;

  const [items, total] = await Promise.all([
    ReturnRecord.find(filter)
      .populate('processedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReturnRecord.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(total, page, limit) };
};
