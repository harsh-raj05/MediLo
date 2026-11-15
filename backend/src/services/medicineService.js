import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { Medicine } from '../models/Medicine.js';
import { Batch } from '../models/Batch.js';
import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { recordAudit } from './auditService.js';

const escapeRegex = (s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const listCategories = async () => {
  return Category.find({ isActive: true }).sort({ name: 1 }).lean();
};

export const createCategory = async (payload, actor) => {
  const slug = slugify(payload.name);
  const category = await Category.create({ ...payload, slug });
  await recordAudit({
    actor,
    action: 'CATEGORY_CREATED',
    entityType: 'Category',
    entityId: category._id,
    summary: `Created category ${category.name}`,
  });
  return category;
};

export const listSuppliers = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true' || query.isActive === true;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { code: regex }, { contactPerson: regex }, { email: regex }];
  }

  const [items, total] = await Promise.all([
    Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(filter),
  ]);
  return { items, pagination: buildPaginationMeta(total, page, limit) };
};

export const createSupplier = async (payload, actor) => {
  const supplier = await Supplier.create({
    ...payload,
    code: payload.code.toUpperCase().trim(),
  });
  await recordAudit({
    actor,
    action: 'SUPPLIER_CREATED',
    entityType: 'Supplier',
    entityId: supplier._id,
    summary: `Created supplier ${supplier.code} (${supplier.name})`,
  });
  return supplier;
};

export const updateSupplier = async (id, payload, actor) => {
  const supplier = await Supplier.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!supplier) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found');
  }
  await recordAudit({
    actor,
    action: 'SUPPLIER_UPDATED',
    entityType: 'Supplier',
    entityId: supplier._id,
    summary: `Updated supplier ${supplier.code} (${supplier.name})`,
  });
  return supplier;
};

export const listMedicines = async (query = {}, user = null) => {
  const { page, limit, skip } = parsePagination(query);
  const isStaff = user && ['admin', 'pharmacist'].includes(user.role);
  const now = new Date();
  const nearExpiryCutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const filter = {};
  if (!isStaff) {
    filter.isActive = true;
  } else if (query.isActive !== undefined && query.isActive !== '') {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.isOtc !== undefined && query.isOtc !== '') {
    filter.isOtc = query.isOtc === 'true' || query.isOtc === true;
  }
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { genericName: regex }, { sku: regex }, { manufacturer: regex }];
  }

  const allMatching = await Medicine.find(filter)
    .populate('categoryId', 'name slug defaultTaxRatePct')
    .populate('primarySupplierId', 'name code')
    .sort({ name: 1 })
    .lean();

  const medIds = allMatching.map((m) => m._id);
  const batches = await Batch.find({ medicineId: { $in: medIds } })
    .sort({ expiryDate: 1, receivedAt: 1 })
    .lean();

  const batchesByMed = new Map();
  for (const b of batches) {
    const key = String(b.medicineId);
    if (!batchesByMed.has(key)) batchesByMed.set(key, []);
    batchesByMed.get(key).push(b);
  }

  let enriched = allMatching.map((med) => {
    const medBatches = batchesByMed.get(String(med._id)) || [];
    let sellableQuantity = 0;
    let expiredQuantity = 0;
    let quarantinedQuantity = 0;
    let nextExpiryDate = null;
    let fefoPrice = null;
    let hasNearExpiry = false;

    const visibleBatches = [];
    for (const b of medBatches) {
      const exp = new Date(b.expiryDate);
      const isExpired = exp <= now || b.status === 'expired';

      if (b.status === 'active' && !isExpired && b.quantityOnHand > 0) {
        sellableQuantity += b.quantityOnHand;
        if (!nextExpiryDate) {
          nextExpiryDate = b.expiryDate;
          fefoPrice = b.salePrice;
        }
        if (exp <= nearExpiryCutoff) {
          hasNearExpiry = true;
        }
      } else if (isExpired && b.quantityOnHand > 0) {
        expiredQuantity += b.quantityOnHand;
      } else if (b.status === 'quarantined' && b.quantityOnHand > 0) {
        quarantinedQuantity += b.quantityOnHand;
      }

      if (isStaff) {
        visibleBatches.push({
          ...b,
          isExpired,
          isNearExpiry: !isExpired && b.status === 'active' && b.quantityOnHand > 0 && exp <= nearExpiryCutoff,
        });
      }
    }

    // Fallback price if out of stock: latest batch salePrice
    if (fefoPrice === null && medBatches.length > 0) {
      fefoPrice = medBatches[medBatches.length - 1].salePrice;
    }

    const isLowStock = sellableQuantity <= med.reorderLevel;

    const base = {
      ...med,
      category: med.categoryId,
      primarySupplier: med.primarySupplierId,
      sellableQuantity,
      nextExpiryDate,
      unitPrice: fefoPrice ?? 0,
      isLowStock,
      isOutOfStock: sellableQuantity === 0,
      hasNearExpiry,
    };

    if (isStaff) {
      base.expiredQuantity = expiredQuantity;
      base.quarantinedQuantity = quarantinedQuantity;
      base.batchCount = medBatches.length;
      if (query.includeBatches === 'true') {
        base.batches = visibleBatches;
      }
    }

    return base;
  });

  if (query.stockStatus === 'low') {
    enriched = enriched.filter((m) => m.isLowStock);
  } else if (query.stockStatus === 'out') {
    enriched = enriched.filter((m) => m.isOutOfStock);
  } else if (query.stockStatus === 'in_stock') {
    enriched = enriched.filter((m) => m.sellableQuantity > 0);
  } else if (query.stockStatus === 'near_expiry') {
    enriched = enriched.filter((m) => m.hasNearExpiry);
  }

  const total = enriched.length;
  const paged = enriched.slice(skip, skip + limit);

  return {
    items: paged,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

export const getMedicineById = async (id, user = null) => {
  const isStaff = user && ['admin', 'pharmacist'].includes(user.role);
  const med = await Medicine.findById(id)
    .populate('categoryId', 'name slug defaultTaxRatePct')
    .populate('primarySupplierId', 'name code')
    .lean();

  if (!med || (!isStaff && !med.isActive)) {
    throw new AppError(404, 'MEDICINE_NOT_FOUND', 'Medicine not found');
  }

  const now = new Date();
  const batches = await Batch.find({ medicineId: med._id }).sort({ expiryDate: 1, receivedAt: 1 }).lean();
  const sellableBatches = batches.filter((b) => b.status === 'active' && new Date(b.expiryDate) > now && b.quantityOnHand > 0);
  const sellableQuantity = sellableBatches.reduce((sum, b) => sum + b.quantityOnHand, 0);

  return {
    ...med,
    category: med.categoryId,
    primarySupplier: med.primarySupplierId,
    sellableQuantity,
    unitPrice: sellableBatches[0]?.salePrice ?? batches[0]?.salePrice ?? 0,
    ...(isStaff ? { batches } : {}),
  };
};

export const createMedicine = async (payload, actor) => {
  const category = await Category.findById(payload.categoryId).lean();
  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category does not exist');
  }
  if (payload.primarySupplierId) {
    const supplier = await Supplier.findById(payload.primarySupplierId).lean();
    if (!supplier) {
      throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Primary supplier does not exist');
    }
  }

  const medicine = await Medicine.create({
    ...payload,
    sku: payload.sku.toUpperCase().trim(),
    taxRatePct: payload.taxRatePct ?? category.defaultTaxRatePct ?? 5,
  });

  await recordAudit({
    actor,
    action: 'MEDICINE_CREATED',
    entityType: 'Medicine',
    entityId: medicine._id,
    summary: `Created medicine ${medicine.sku} (${medicine.name})`,
  });

  return medicine;
};

export const updateMedicine = async (id, payload, actor) => {
  if (payload.categoryId) {
    const category = await Category.findById(payload.categoryId).lean();
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category does not exist');
  }
  const medicine = await Medicine.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!medicine) {
    throw new AppError(404, 'MEDICINE_NOT_FOUND', 'Medicine not found');
  }

  await recordAudit({
    actor,
    action: 'MEDICINE_UPDATED',
    entityType: 'Medicine',
    entityId: medicine._id,
    summary: `Updated medicine ${medicine.sku} (${medicine.name})`,
  });

  return medicine;
};
