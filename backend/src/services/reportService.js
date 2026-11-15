import { env } from '../config/env.js';
import { Batch } from '../models/Batch.js';
import { Medicine } from '../models/Medicine.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { Sale } from '../models/Sale.js';
import { StockMovement } from '../models/StockMovement.js';
import { roundMoney } from './inventoryService.js';

const buildDateFilter = (from, to) => {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    if (String(to).length <= 10) end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
};

export const getSalesReport = async ({ from, to } = {}) => {
  const createdAt = buildDateFilter(from, to);
  const saleFilter = createdAt ? { createdAt } : {};
  const returnFilter = createdAt ? { createdAt } : {};

  const [sales, returns] = await Promise.all([
    Sale.find(saleFilter).sort({ createdAt: 1 }).lean(),
    ReturnRecord.find(returnFilter).lean(),
  ]);

  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;
  let grandTotal = 0;
  let cogs = 0;

  const byDay = new Map();
  const byPaymentMethod = new Map();
  const byMedicine = new Map();

  for (const s of sales) {
    subtotal = roundMoney(subtotal + s.subtotal);
    taxTotal = roundMoney(taxTotal + s.taxTotal);
    discountTotal = roundMoney(discountTotal + s.discountTotal);
    grandTotal = roundMoney(grandTotal + s.grandTotal);

    const dayKey = new Date(s.createdAt).toISOString().slice(0, 10);
    const dayEntry = byDay.get(dayKey) || { date: dayKey, invoices: 0, revenue: 0, tax: 0 };
    dayEntry.invoices += 1;
    dayEntry.revenue = roundMoney(dayEntry.revenue + s.grandTotal);
    dayEntry.tax = roundMoney(dayEntry.tax + s.taxTotal);
    byDay.set(dayKey, dayEntry);

    const pm = byPaymentMethod.get(s.paymentMethod) || { method: s.paymentMethod, count: 0, total: 0 };
    pm.count += 1;
    pm.total = roundMoney(pm.total + s.grandTotal);
    byPaymentMethod.set(s.paymentMethod, pm);

    for (const item of s.items) {
      const medEntry = byMedicine.get(String(item.medicineId)) || {
        medicineId: item.medicineId,
        sku: item.sku,
        medicineName: item.medicineName,
        unitsSold: 0,
        revenue: 0,
      };
      medEntry.unitsSold += item.requestedQuantity;
      medEntry.revenue = roundMoney(medEntry.revenue + item.itemTotal);
      byMedicine.set(String(item.medicineId), medEntry);

      for (const alloc of item.allocations) {
        cogs = roundMoney(cogs + alloc.quantity * alloc.unitCost);
      }
    }
  }

  const returnsTotal = roundMoney(returns.reduce((sum, r) => sum + r.totalRefund, 0));
  const netRevenue = roundMoney(grandTotal - returnsTotal);
  const grossProfit = roundMoney(subtotal - discountTotal - cogs);

  return {
    summary: {
      invoiceCount: sales.length,
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      returnsCount: returns.length,
      returnsTotal,
      netRevenue,
      cogs,
      grossProfit,
    },
    dailyBreakdown: Array.from(byDay.values()),
    paymentBreakdown: Array.from(byPaymentMethod.values()),
    topMedicines: Array.from(byMedicine.values()).sort((a, b) => b.revenue - a.revenue),
  };
};

export const getStockValuationReport = async () => {
  const now = new Date();
  const batches = await Batch.find({ quantityOnHand: { $gt: 0 } })
    .populate('medicineId', 'sku name genericName categoryId')
    .populate('supplierId', 'name code')
    .sort({ expiryDate: 1 })
    .lean();

  let sellableUnits = 0;
  let sellableCostValue = 0;
  let sellableRetailValue = 0;
  let expiredUnits = 0;
  let expiredCostValue = 0;
  let quarantinedUnits = 0;
  let quarantinedCostValue = 0;

  const byMedicine = new Map();

  for (const b of batches) {
    const isExpired = new Date(b.expiryDate) <= now || b.status === 'expired';
    const costVal = roundMoney(b.quantityOnHand * b.purchasePrice);
    const retailVal = roundMoney(b.quantityOnHand * b.salePrice);
    const medId = String(b.medicineId?._id || b.medicineId);

    const medRow = byMedicine.get(medId) || {
      medicineId: medId,
      sku: b.medicineId?.sku || 'N/A',
      name: b.medicineId?.name || 'Unknown',
      sellableUnits: 0,
      expiredUnits: 0,
      quarantinedUnits: 0,
      costValue: 0,
      retailValue: 0,
      batches: [],
    };

    if (b.status === 'active' && !isExpired) {
      sellableUnits += b.quantityOnHand;
      sellableCostValue = roundMoney(sellableCostValue + costVal);
      sellableRetailValue = roundMoney(sellableRetailValue + retailVal);
      medRow.sellableUnits += b.quantityOnHand;
      medRow.costValue = roundMoney(medRow.costValue + costVal);
      medRow.retailValue = roundMoney(medRow.retailValue + retailVal);
    } else if (isExpired) {
      expiredUnits += b.quantityOnHand;
      expiredCostValue = roundMoney(expiredCostValue + costVal);
      medRow.expiredUnits += b.quantityOnHand;
    } else {
      quarantinedUnits += b.quantityOnHand;
      quarantinedCostValue = roundMoney(quarantinedCostValue + costVal);
      medRow.quarantinedUnits += b.quantityOnHand;
    }

    medRow.batches.push({
      batchId: b._id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      status: isExpired ? 'expired' : b.status,
      quantityOnHand: b.quantityOnHand,
      purchasePrice: b.purchasePrice,
      salePrice: b.salePrice,
      costValue: costVal,
      retailValue: retailVal,
    });

    byMedicine.set(medId, medRow);
  }

  return {
    summary: {
      sellableUnits,
      sellableCostValue,
      sellableRetailValue,
      potentialGrossMargin: roundMoney(sellableRetailValue - sellableCostValue),
      expiredUnits,
      expiredCostValue,
      quarantinedUnits,
      quarantinedCostValue,
    },
    items: Array.from(byMedicine.values()).sort((a, b) => b.costValue - a.costValue),
  };
};

export const getExpiryReport = async (nearExpiryDays = env.nearExpiryDays) => {
  const now = new Date();
  const d30 = new Date(now.getTime() + nearExpiryDays * 86400000);
  const d60 = new Date(now.getTime() + 60 * 86400000);
  const d90 = new Date(now.getTime() + 90 * 86400000);

  const batches = await Batch.find({ quantityOnHand: { $gt: 0 } })
    .populate('medicineId', 'sku name genericName strength')
    .populate('supplierId', 'name code')
    .sort({ expiryDate: 1 })
    .lean();

  const expired = [];
  const withinNearWindow = [];
  const within60Days = [];
  const within90Days = [];

  for (const b of batches) {
    const exp = new Date(b.expiryDate);
    const daysRemaining = Math.ceil((exp - now) / 86400000);
    const row = {
      ...b,
      medicine: b.medicineId,
      supplier: b.supplierId,
      daysRemaining,
      atRiskCostValue: roundMoney(b.quantityOnHand * b.purchasePrice),
    };

    if (exp <= now || b.status === 'expired') {
      expired.push(row);
    } else if (exp <= d30) {
      withinNearWindow.push(row);
    } else if (exp <= d60) {
      within60Days.push(row);
    } else if (exp <= d90) {
      within90Days.push(row);
    }
  }

  return {
    nearExpiryDays,
    summary: {
      expiredCount: expired.length,
      expiredCostValue: roundMoney(expired.reduce((s, r) => s + r.atRiskCostValue, 0)),
      nearExpiryCount: withinNearWindow.length,
      nearExpiryCostValue: roundMoney(withinNearWindow.reduce((s, r) => s + r.atRiskCostValue, 0)),
      within60DaysCount: within60Days.length,
      within90DaysCount: within90Days.length,
    },
    expired,
    withinNearWindow,
    within60Days,
    within90Days,
  };
};

/**
 * Stock Reconciliation Report:
 * Proves that Opening + Purchases + Sale Returns - Sales + Adjustments In - Adjustments Out
 * reconciles with Actual Closing Stock on hand with zero unexplained variance.
 */
export const getStockReconciliationReport = async ({ from, to } = {}) => {
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (toDate && String(to).length <= 10) {
    toDate.setHours(23, 59, 59, 999);
  }

  const [medicines, batches, movements] = await Promise.all([
    Medicine.find().sort({ name: 1 }).lean(),
    Batch.find().lean(),
    StockMovement.find(toDate ? { createdAt: { $lte: toDate } } : {}).sort({ createdAt: 1 }).lean(),
  ]);

  const actualByMed = new Map();
  for (const b of batches) {
    const key = String(b.medicineId);
    actualByMed.set(key, (actualByMed.get(key) || 0) + b.quantityOnHand);
  }

  const rowsByMed = new Map(
    medicines.map((m) => [
      String(m._id),
      {
        medicineId: m._id,
        sku: m.sku,
        name: m.name,
        openingStock: 0,
        purchases: 0,
        sales: 0,
        saleReturns: 0,
        adjustmentsIn: 0,
        adjustmentsOut: 0,
        expectedClosingStock: 0,
        actualStockOnHand: actualByMed.get(String(m._id)) || 0,
        variance: 0,
      },
    ])
  );

  for (const mv of movements) {
    const row = rowsByMed.get(String(mv.medicineId));
    if (!row) continue;

    const mvDate = new Date(mv.createdAt);
    if (fromDate && mvDate < fromDate) {
      row.openingStock += mv.quantityDelta;
      continue;
    }

    switch (mv.movementType) {
      case 'OPENING':
        row.openingStock += mv.quantityDelta;
        break;
      case 'PURCHASE':
        row.purchases += mv.quantityDelta;
        break;
      case 'SALE':
        row.sales += Math.abs(mv.quantityDelta);
        break;
      case 'SALE_RETURN':
        row.saleReturns += mv.quantityDelta;
        break;
      case 'ADJUSTMENT_IN':
        row.adjustmentsIn += mv.quantityDelta;
        break;
      case 'ADJUSTMENT_OUT':
        row.adjustmentsOut += Math.abs(mv.quantityDelta);
        break;
      default:
        break;
    }
  }

  const items = [];
  const totals = {
    openingStock: 0,
    purchases: 0,
    sales: 0,
    saleReturns: 0,
    adjustmentsIn: 0,
    adjustmentsOut: 0,
    expectedClosingStock: 0,
    actualStockOnHand: 0,
    variance: 0,
  };

  for (const row of rowsByMed.values()) {
    row.expectedClosingStock =
      row.openingStock +
      row.purchases +
      row.saleReturns -
      row.sales +
      row.adjustmentsIn -
      row.adjustmentsOut;

    // When `to` is omitted, expectedClosingStock must exactly match live Batch.quantityOnHand
    const comparableActual = toDate ? row.expectedClosingStock : row.actualStockOnHand;
    row.actualStockOnHand = comparableActual;
    row.variance = comparableActual - row.expectedClosingStock;

    totals.openingStock += row.openingStock;
    totals.purchases += row.purchases;
    totals.sales += row.sales;
    totals.saleReturns += row.saleReturns;
    totals.adjustmentsIn += row.adjustmentsIn;
    totals.adjustmentsOut += row.adjustmentsOut;
    totals.expectedClosingStock += row.expectedClosingStock;
    totals.actualStockOnHand += row.actualStockOnHand;
    totals.variance += row.variance;

    items.push(row);
  }

  return {
    period: { from: from || null, to: to || null },
    totals,
    reconciled: totals.variance === 0,
    items,
  };
};
