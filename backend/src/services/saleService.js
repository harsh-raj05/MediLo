import crypto from 'node:crypto';
import { Batch } from '../models/Batch.js';
import { Medicine } from '../models/Medicine.js';
import { Sale } from '../models/Sale.js';
import { StockMovement } from '../models/StockMovement.js';
import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { runInTransaction, withSession } from '../utils/tx.js';
import { recordAudit } from './auditService.js';
import { calculateLinePricing, computeFefoPlan, roundMoney } from './inventoryService.js';

const generateInvoiceNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `INV-${datePart}-${rand}`;
};

const rollbackAtomicDeductions = async (deductions) => {
  for (const d of deductions) {
    await Batch.findByIdAndUpdate(d.batchId, {
      $inc: { quantityOnHand: d.quantity },
      $set: { status: 'active' },
    }).catch(() => {});
  }
};

export const createSale = async ({
  items,
  customerName,
  customerPhone = '',
  paymentMethod = 'CASH',
  discountTotal = 0,
  notes = '',
  actor,
}) => {
  const isCustomerOrder = actor.role === 'customer';
  const saleType = isCustomerOrder ? 'ONLINE_ORDER' : 'POS';
  const effectiveDiscount = isCustomerOrder ? 0 : roundMoney(discountTotal);

  const medIds = [...new Set(items.map((i) => String(i.medicineId)))];
  const medicines = await Medicine.find({ _id: { $in: medIds } }).lean();
  const medMap = new Map(medicines.map((m) => [String(m._id), m]));

  for (const item of items) {
    const med = medMap.get(String(item.medicineId));
    if (!med || !med.isActive) {
      throw new AppError(404, 'MEDICINE_NOT_FOUND', `Active medicine ${item.medicineId} not found`);
    }
    if (isCustomerOrder && !med.isOtc) {
      throw new AppError(
        403,
        'OTC_ONLY_ONLINE',
        `${med.name} is not eligible for self-service online checkout. Please visit the pharmacy counter.`
      );
    }
    if (isCustomerOrder && item.batchId) {
      throw new AppError(403, 'FORBIDDEN_BATCH_OVERRIDE', 'Customers cannot manually override FEFO batch selection');
    }
  }

  return runInTransaction(async (session) => {
    const now = new Date();
    const atomicRollbackLog = [];
    const saleItems = [];
    const movementsToCreate = [];

    let subtotal = 0;
    let taxTotal = 0;

    try {
      for (const reqItem of items) {
        const med = medMap.get(String(reqItem.medicineId));
        let chosenPlan = [];

        if (reqItem.batchId) {
          // Explicit batch requested by pharmacist/admin: strictly block expired or quarantined batches
          const targetBatch = await Batch.findById(reqItem.batchId, null, withSession(session));
          if (!targetBatch || String(targetBatch.medicineId) !== String(med._id)) {
            throw new AppError(404, 'BATCH_NOT_FOUND', `Batch ${reqItem.batchId} not found for ${med.name}`);
          }
          if (new Date(targetBatch.expiryDate) <= now || targetBatch.status === 'expired') {
            throw new AppError(
              409,
              'BATCH_EXPIRED',
              `Batch ${targetBatch.batchNumber} of ${med.name} expired on ${new Date(targetBatch.expiryDate).toISOString().slice(0, 10)} and cannot be sold`
            );
          }
          if (targetBatch.status !== 'active') {
            throw new AppError(
              409,
              'BATCH_NOT_SELLABLE',
              `Batch ${targetBatch.batchNumber} is ${targetBatch.status} and cannot be sold`
            );
          }
          if (targetBatch.quantityOnHand < reqItem.quantity) {
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              `Insufficient stock in batch ${targetBatch.batchNumber}: requested ${reqItem.quantity}, available ${targetBatch.quantityOnHand}`
            );
          }
          chosenPlan = [{ batch: targetBatch.toObject(), quantity: reqItem.quantity }];
        } else {
          // FEFO automatic batch allocation
          const allMedBatches = await Batch.find({ medicineId: med._id }, null, withSession(session))
            .sort({ expiryDate: 1, receivedAt: 1 })
            .lean();

          const plan = computeFefoPlan(allMedBatches, reqItem.quantity, now);
          if (plan.remainingUnfulfilled > 0) {
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              `Insufficient non-expired stock for ${med.name}: requested ${reqItem.quantity}, available ${plan.totalAvailable}`
            );
          }
          chosenPlan = plan.allocated;
        }

        const allocations = [];
        let itemSubtotal = 0;
        let itemTax = 0;
        let itemTotal = 0;

        for (const step of chosenPlan) {
          const updatedBatch = await Batch.findOneAndUpdate(
            {
              _id: step.batch._id,
              quantityOnHand: { $gte: step.quantity },
              expiryDate: { $gt: now },
              status: 'active',
            },
            { $inc: { quantityOnHand: -step.quantity } },
            { new: true, ...withSession(session) }
          );

          if (!updatedBatch) {
            throw new AppError(
              409,
              'CONCURRENT_STOCK_CONFLICT',
              `Availability changed concurrently for ${med.name} (batch ${step.batch.batchNumber}). Please retry.`
            );
          }

          if (!session) {
            atomicRollbackLog.push({ batchId: updatedBatch._id, quantity: step.quantity });
          }

          const balanceAfter = updatedBatch.quantityOnHand;
          const balanceBefore = balanceAfter + step.quantity;

          if (balanceAfter === 0) {
            updatedBatch.status = 'depleted';
            await updatedBatch.save(withSession(session));
          }

          const pricing = calculateLinePricing(step.quantity, updatedBatch.salePrice, med.taxRatePct);

          allocations.push({
            batchId: updatedBatch._id,
            batchNumber: updatedBatch.batchNumber,
            expiryDate: updatedBatch.expiryDate,
            quantity: step.quantity,
            returnedQuantity: 0,
            unitPrice: updatedBatch.salePrice,
            unitCost: updatedBatch.purchasePrice,
            ...pricing,
          });

          itemSubtotal = roundMoney(itemSubtotal + pricing.lineSubtotal);
          itemTax = roundMoney(itemTax + pricing.lineTax);
          itemTotal = roundMoney(itemTotal + pricing.lineTotal);

          movementsToCreate.push({
            medicineId: med._id,
            batchId: updatedBatch._id,
            batchNumber: updatedBatch.batchNumber,
            movementType: 'SALE',
            quantityDelta: -step.quantity,
            balanceBefore,
            balanceAfter,
            unitCost: updatedBatch.purchasePrice,
            referenceType: 'SALE',
            referenceId: null, // filled after Sale is created
            referenceCode: '',
            reason: `${saleType} sale`,
            performedBy: actor._id,
          });
        }

        subtotal = roundMoney(subtotal + itemSubtotal);
        taxTotal = roundMoney(taxTotal + itemTax);

        saleItems.push({
          medicineId: med._id,
          medicineName: med.name,
          sku: med.sku,
          requestedQuantity: reqItem.quantity,
          returnedQuantity: 0,
          taxRatePct: med.taxRatePct,
          allocations,
          itemSubtotal,
          itemTax,
          itemTotal,
        });
      }

      if (effectiveDiscount > subtotal) {
        throw new AppError(400, 'INVALID_DISCOUNT', 'Discount cannot exceed sale subtotal');
      }

      const grandTotal = roundMoney(subtotal + taxTotal - effectiveDiscount);
      const invoiceNumber = generateInvoiceNumber();

      const [sale] = await Sale.create(
        [
          {
            invoiceNumber,
            saleType,
            customerId: isCustomerOrder ? actor._id : null,
            customerName: isCustomerOrder ? actor.name : (customerName || 'Walk-in Customer').trim(),
            customerPhone: isCustomerOrder ? actor.phone || customerPhone : customerPhone.trim(),
            items: saleItems,
            subtotal,
            taxTotal,
            discountTotal: effectiveDiscount,
            grandTotal,
            paymentMethod: isCustomerOrder ? 'ONLINE' : paymentMethod,
            status: 'COMPLETED',
            notes: notes.trim(),
            createdBy: actor._id,
          },
        ],
        withSession(session)
      );

      for (const m of movementsToCreate) {
        m.referenceId = sale._id;
        m.referenceCode = invoiceNumber;
        m.reason = `${saleType === 'ONLINE_ORDER' ? 'Online customer order' : 'POS counter sale'} (${invoiceNumber})`;
      }
      if (movementsToCreate.length > 0) {
        await StockMovement.insertMany(movementsToCreate, { ...withSession(session), ordered: true });
      }

      await recordAudit(
        {
          actor,
          action: saleType === 'ONLINE_ORDER' ? 'ONLINE_ORDER_PLACED' : 'POS_SALE_COMPLETED',
          entityType: 'Sale',
          entityId: sale._id,
          summary: `${saleType} ${invoiceNumber} completed for ${sale.customerName}, total ${grandTotal}`,
          metadata: { invoiceNumber, saleType, grandTotal, itemCount: saleItems.length },
        },
        session
      );

      return sale;
    } catch (err) {
      if (!session && atomicRollbackLog.length > 0) {
        await rollbackAtomicDeductions(atomicRollbackLog);
      }
      throw err;
    }
  });
};

export const listSales = async (query = {}, actor) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (actor.role === 'customer') {
    filter.customerId = actor._id;
  } else {
    if (query.saleType) filter.saleType = query.saleType;
    if (query.status) filter.status = query.status;
  }

  if (query.search) {
    const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ invoiceNumber: regex }, { customerName: regex }];
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    Sale.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(total, page, limit) };
};

export const getSaleById = async (id, actor) => {
  const sale = await Sale.findById(id).populate('createdBy', 'name email role').lean();
  if (!sale) {
    throw new AppError(404, 'SALE_NOT_FOUND', 'Sale invoice not found');
  }
  if (actor.role === 'customer' && String(sale.customerId) !== String(actor._id)) {
    throw new AppError(403, 'FORBIDDEN', 'You can only view your own order invoices');
  }
  return sale;
};
