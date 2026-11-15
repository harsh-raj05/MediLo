import { z } from 'zod';
import { DOSAGE_FORMS } from '../models/Medicine.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  phone: z.string().trim().max(30).optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const updateUserAccessSchema = z
  .object({
    role: z.enum(['admin', 'pharmacist', 'customer']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: 'Provide role or isActive to update',
  });

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default(''),
  defaultTaxRatePct: z.coerce.number().min(0).max(50).optional().default(5),
});

export const createSupplierSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(140),
  contactPerson: z.string().trim().max(100).optional().default(''),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().or(z.literal('')).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
  taxId: z.string().trim().max(50).optional().default(''),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional().default(30),
  isActive: z.boolean().optional().default(true),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const createMedicineSchema = z.object({
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(140),
  genericName: z.string().trim().min(2).max(140),
  categoryId: objectId,
  primarySupplierId: objectId.nullable().optional(),
  dosageForm: z.enum(DOSAGE_FORMS),
  strength: z.string().trim().min(1).max(60),
  manufacturer: z.string().trim().min(2).max(120),
  unit: z.string().trim().min(1).max(30).optional().default('pack'),
  reorderLevel: z.coerce.number().int().min(0).optional().default(15),
  taxRatePct: z.coerce.number().min(0).max(50).optional(),
  isOtc: z.boolean().optional().default(true),
  description: z.string().trim().max(600).optional().default(''),
  storageInstructions: z.string().trim().max(300).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateMedicineSchema = createMedicineSchema.partial();

export const createPurchaseSchema = z.object({
  supplierId: objectId,
  supplierInvoiceNumber: z.string().trim().min(2).max(80),
  purchaseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  notes: z.string().trim().max(500).optional().default(''),
  items: z
    .array(
      z.object({
        medicineId: objectId,
        batchNumber: z.string().trim().min(2).max(60),
        expiryDate: z.string().min(8),
        quantity: z.coerce.number().int().min(1),
        unitCost: z.coerce.number().min(0),
        salePrice: z.coerce.number().min(0),
      })
    )
    .min(1),
});

export const createSaleSchema = z.object({
  customerName: z.string().trim().min(1).max(120).optional().default('Walk-in Customer'),
  customerPhone: z.string().trim().max(30).optional().default(''),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'ONLINE']).optional().default('CASH'),
  discountTotal: z.coerce.number().min(0).optional().default(0),
  notes: z.string().trim().max(500).optional().default(''),
  items: z
    .array(
      z.object({
        medicineId: objectId,
        quantity: z.coerce.number().int().min(1),
        batchId: objectId.optional(),
      })
    )
    .min(1),
});

export const createReturnSchema = z.object({
  saleId: objectId,
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(400),
  condition: z.enum(['RESTOCKABLE', 'DAMAGED']).optional().default('RESTOCKABLE'),
  items: z
    .array(
      z.object({
        medicineId: objectId,
        batchId: objectId,
        quantity: z.coerce.number().int().min(1),
      })
    )
    .min(1),
});

export const adjustStockSchema = z.object({
  batchId: objectId,
  delta: z.coerce.number().int().refine((n) => n !== 0, 'Delta cannot be 0'),
  adjustmentType: z.enum(['DAMAGE', 'EXPIRED_DISPOSAL', 'AUDIT_CORRECTION', 'QUARANTINE']),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(400),
});
