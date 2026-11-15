import crypto from 'node:crypto';
import { Batch } from '../models/Batch.js';
import { Medicine } from '../models/Medicine.js';
import { Purchase } from '../models/Purchase.js';
import { StockMovement } from '../models/StockMovement.js';
import { Supplier } from '../models/Supplier.js';
import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { runInTransaction, withSession } from '../utils/tx.js';
import { recordAudit } from './auditService.js';
import { roundMoney } from './inventoryService.js';

const generateCode = (prefix) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${datePart}-${rand}`;
};

export const createPurchase = async ({
  supplierId,
  supplierInvoiceNumber,
  purchaseDate,
  items,
  notes = '',
  actor,
}) => {
  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier || !supplier.isActive) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Active supplier not found');
  }

  const now = new Date();
  const medIds = [...new Set(items.map((i) => String(i.medicineId)))];
  const medicines = await Medicine.find({ _id: { $in: medIds } }).lean();
  const medMap = new Map(medicines.map((m) => [String(m._id), m]));

  for (const item of items) {
    if (!medMap.has(String(item.medicineId))) {
      throw new AppError(404, 'MEDICINE_NOT_FOUND', `Medicine ${item.medicineId} not found`);
    }
    if (new Date(item.expiryDate) <= now) {
      throw new AppError(
        400,
        'EXPIRED_PURCHASE_BATCH',
        `Batch ${item.batchNumber} has an expiry date in the past and cannot be received into active stock`
      );
    }
  }

  return runInTransaction(async (session) => {
    const purchaseNumber = generateCode('PO');
    const purchaseItems = [];
    const createdMovements = [];
    let totalCost = 0;

    // Pre-create purchase ID so batches can reference it
    const [purchaseDoc] = await Purchase.create(
      [
        {
          purchaseNumber,
          supplierId: supplier._id,
          supplierInvoiceNumber: supplierInvoiceNumber.trim(),
          purchaseDate: purchaseDate ? new Date(purchaseDate) : now,
          items: [
            {
              medicineId: medIds[0],
              medicineName: 'pending',
              sku: 'PENDING',
              batchNumber: 'PENDING',
              batchId: supplier._id,
              expiryDate: now,
              quantity: 1,
              unitCost: 0,
              salePrice: 0,
              lineCost: 0,
            },
          ],
          totalCost: 0,
          notes: notes.trim(),
          createdBy: actor._id,
        },
      ],
      withSession(session)
    );

    for (const item of items) {
      const med = medMap.get(String(item.medicineId));
      const normalizedBatch = item.batchNumber.toUpperCase().trim();
      const expiryDate = new Date(item.expiryDate);

      let batch = await Batch.findOne(
        { medicineId: med._id, batchNumber: normalizedBatch },
        null,
        withSession(session)
      );

      let balanceBefore = 0;
      if (batch) {
        const existingExp = new Date(batch.expiryDate).toISOString().slice(0, 10);
        const incomingExp = expiryDate.toISOString().slice(0, 10);
        if (existingExp !== incomingExp) {
          throw new AppError(
            409,
            'BATCH_EXPIRY_MISMATCH',
            `Batch ${normalizedBatch} for ${med.name} already exists with expiry ${existingExp}`
          );
        }
        balanceBefore = batch.quantityOnHand;
        batch.quantityOnHand += item.quantity;
        batch.initialQuantity += item.quantity;
        batch.purchasePrice = item.unitCost;
        batch.salePrice = item.salePrice;
        if (batch.status === 'depleted') batch.status = 'active';
        await batch.save(withSession(session));
      } else {
        const [createdBatch] = await Batch.create(
          [
            {
              medicineId: med._id,
              supplierId: supplier._id,
              purchaseId: purchaseDoc._id,
              batchNumber: normalizedBatch,
              expiryDate,
              receivedAt: purchaseDate ? new Date(purchaseDate) : now,
              initialQuantity: item.quantity,
              quantityOnHand: item.quantity,
              purchasePrice: item.unitCost,
              salePrice: item.salePrice,
              status: 'active',
            },
          ],
          withSession(session)
        );
        batch = createdBatch;
      }

      const lineCost = roundMoney(item.quantity * item.unitCost);
      totalCost = roundMoney(totalCost + lineCost);

      purchaseItems.push({
        medicineId: med._id,
        medicineName: med.name,
        sku: med.sku,
        batchNumber: normalizedBatch,
        batchId: batch._id,
        expiryDate,
        quantity: item.quantity,
        unitCost: item.unitCost,
        salePrice: item.salePrice,
        lineCost,
      });

      createdMovements.push({
        medicineId: med._id,
        batchId: batch._id,
        batchNumber: normalizedBatch,
        movementType: 'PURCHASE',
        quantityDelta: item.quantity,
        balanceBefore,
        balanceAfter: batch.quantityOnHand,
        unitCost: item.unitCost,
        referenceType: 'PURCHASE',
        referenceId: purchaseDoc._id,
        referenceCode: purchaseNumber,
        reason: `Stock received from ${supplier.name} (Supplier Inv: ${supplierInvoiceNumber.trim()})`,
        performedBy: actor._id,
      });
    }

    purchaseDoc.items = purchaseItems;
    purchaseDoc.totalCost = totalCost;
    await purchaseDoc.save(withSession(session));

    if (createdMovements.length > 0) {
      await StockMovement.insertMany(createdMovements, { ...withSession(session), ordered: true });
    }

    await recordAudit(
      {
        actor,
        action: 'PURCHASE_RECEIVED',
        entityType: 'Purchase',
        entityId: purchaseDoc._id,
        summary: `Received purchase ${purchaseNumber} from ${supplier.name} (${purchaseItems.length} line(s), total ${totalCost})`,
        metadata: { purchaseNumber, supplierInvoiceNumber, totalCost },
      },
      session
    );

    return purchaseDoc;
  });
};

export const listPurchases = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.search) {
    const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ purchaseNumber: regex }, { supplierInvoiceNumber: regex }];
  }

  const [items, total] = await Promise.all([
    Purchase.find(filter)
      .populate('supplierId', 'name code')
      .populate('createdBy', 'name email')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Purchase.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(total, page, limit) };
};

export const getPurchaseById = async (id) => {
  const purchase = await Purchase.findById(id)
    .populate('supplierId', 'name code contactPerson phone email')
    .populate('createdBy', 'name email')
    .lean();
  if (!purchase) {
    throw new AppError(404, 'PURCHASE_NOT_FOUND', 'Purchase record not found');
  }
  return purchase;
};
