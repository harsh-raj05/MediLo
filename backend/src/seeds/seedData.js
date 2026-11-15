import { AuditLog } from '../models/AuditLog.js';
import { Batch } from '../models/Batch.js';
import { Category } from '../models/Category.js';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { Medicine } from '../models/Medicine.js';
import { Purchase } from '../models/Purchase.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { Sale } from '../models/Sale.js';
import { StockMovement } from '../models/StockMovement.js';
import { Supplier } from '../models/Supplier.js';
import { User } from '../models/User.js';
import { createSale } from '../services/saleService.js';

const daysFromNow = (days) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

export const DEMO_PASSWORD = 'DemoPassword123!';

export const resetDatabase = async () => {
  await Promise.all([
    AuditLog.deleteMany({}),
    IdempotencyKey.deleteMany({}),
    StockMovement.deleteMany({}),
    ReturnRecord.deleteMany({}),
    Sale.deleteMany({}),
    Purchase.deleteMany({}),
    Batch.deleteMany({}),
    Medicine.deleteMany({}),
    Supplier.deleteMany({}),
    Category.deleteMany({}),
    User.deleteMany({}),
  ]);
};

export const seedDatabase = async ({ reset = false } = {}) => {
  if (reset) {
    await resetDatabase();
  } else {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return { skipped: true, reason: 'Database already contains data. Use --reset to reseed.' };
    }
  }

  const passwordHash = await User.hashPassword(DEMO_PASSWORD);
  const [adminUser, pharmacistUser, customerUser] = await User.create([
    {
      name: 'Dr. Elena Vance (Admin)',
      email: 'admin@medilo.demo',
      passwordHash,
      role: 'admin',
      phone: '+91 98765 01001',
    },
    {
      name: 'Marcus Chen (Pharmacist)',
      email: 'pharmacist@medilo.demo',
      passwordHash,
      role: 'pharmacist',
      phone: '+91 98765 01002',
    },
    {
      name: 'Priya Nair (Customer)',
      email: 'customer@medilo.demo',
      passwordHash,
      role: 'customer',
      phone: '+91 98765 01099',
    },
  ]);

  const categories = await Category.create([
    { name: 'Analgesics & Fever', slug: 'analgesics-fever', defaultTaxRatePct: 5, description: 'Fictional pain and fever relief products' },
    { name: 'Antibiotics', slug: 'antibiotics', defaultTaxRatePct: 12, description: 'Fictional prescription-class antimicrobials (POS only)' },
    { name: 'Allergy & Sinus', slug: 'allergy-sinus', defaultTaxRatePct: 5, description: 'Fictional antihistamines and decongestants' },
    { name: 'Digestive Care', slug: 'digestive-care', defaultTaxRatePct: 5, description: 'Fictional antacids and gut comfort formulas' },
    { name: 'Vitamins & Immunity', slug: 'vitamins-immunity', defaultTaxRatePct: 12, description: 'Fictional daily micronutrient supplements' },
    { name: 'First Aid & Topical', slug: 'first-aid-topical', defaultTaxRatePct: 5, description: 'Fictional topical gels and wound care' },
  ]);

  const catMap = new Map(categories.map((c) => [c.slug, c]));

  const suppliers = await Supplier.create([
    {
      code: 'SUP-APEX',
      name: 'Apex BioLogistics Pvt. Ltd.',
      contactPerson: 'Rajesh Sharma',
      phone: '+91 98200 45110',
      email: 'orders@apexbiologistics.demo',
      address: 'Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093',
      taxId: '27AABCA1234D1Z8',
      paymentTermsDays: 30,
    },
    {
      code: 'SUP-NOVA',
      name: 'NovaCare Wholesale Distributors',
      contactPerson: 'Ananya Gupta',
      phone: '+91 98110 99420',
      email: 'supply@novacare.demo',
      address: 'B-88, Okhla Industrial Area Phase II, New Delhi 110020',
      taxId: '07AABCN5678E1Z4',
      paymentTermsDays: 45,
    },
    {
      code: 'SUP-VITA',
      name: 'VitaSource Nutraceuticals',
      contactPerson: 'Karthik Subramanian',
      phone: '+91 98450 33810',
      email: 'dispatch@vitasource.demo',
      address: '15 Electronics City Phase 1, Hosur Road, Bengaluru 560100',
      taxId: '29AABCV9012F1Z2',
      paymentTermsDays: 15,
    },
  ]);

  const [supApex, supNova, supVita] = suppliers;

  // All fictional products (no real medical claims or advice)
  const medicines = await Medicine.create([
    {
      sku: 'MED-CALM-500',
      name: 'MediCalm Relief 500mg',
      genericName: 'Fictional Acetolamide Complex',
      categoryId: catMap.get('analgesics-fever')._id,
      primarySupplierId: supApex._id,
      dosageForm: 'Tablet',
      strength: '500mg (10s Strip)',
      manufacturer: 'Helios Fictional Labs',
      unit: 'strip',
      reorderLevel: 20,
      taxRatePct: 5,
      isOtc: true,
      description: 'Fictional demonstration analgesic tablet pack for demo workflows.',
    },
    {
      sku: 'MED-ALR-10',
      name: 'AllerShield Daily 10mg',
      genericName: 'Fictional Cetrizolene',
      categoryId: catMap.get('allergy-sinus')._id,
      primarySupplierId: supNova._id,
      dosageForm: 'Tablet',
      strength: '10mg (10s Strip)',
      manufacturer: 'Crestline Demo Pharma',
      unit: 'strip',
      reorderLevel: 15,
      taxRatePct: 5,
      isOtc: true,
      description: 'Fictional demonstration non-drowsy allergy relief strip.',
    },
    {
      sku: 'MED-GAS-20',
      name: 'GastroEase Rapid 20mg',
      genericName: 'Fictional Pantopranil',
      categoryId: catMap.get('digestive-care')._id,
      primarySupplierId: supApex._id,
      dosageForm: 'Capsule',
      strength: '20mg (15s Bottle)',
      manufacturer: 'Helios Fictional Labs',
      unit: 'bottle',
      reorderLevel: 15,
      taxRatePct: 5,
      isOtc: true,
      description: 'Fictional demonstration digestive comfort capsule bottle.',
    },
    {
      sku: 'MED-VIT-D3',
      name: 'VitaBoost D3 + Zinc',
      genericName: 'Fictional Cholecalciferol Blend',
      categoryId: catMap.get('vitamins-immunity')._id,
      primarySupplierId: supVita._id,
      dosageForm: 'Capsule',
      strength: '1000 IU (30s)',
      manufacturer: 'VitaSource Demo Labs',
      unit: 'bottle',
      reorderLevel: 12,
      taxRatePct: 12,
      isOtc: true,
      description: 'Fictional demonstration daily vitamin supplement.',
    },
    {
      sku: 'MED-DERM-30',
      name: 'DermaSoothe Cooling Gel',
      genericName: 'Fictional Aloe-Panthenol Gel',
      categoryId: catMap.get('first-aid-topical')._id,
      primarySupplierId: supNova._id,
      dosageForm: 'Cream',
      strength: '30g Tube',
      manufacturer: 'AuraCare Fictional',
      unit: 'tube',
      reorderLevel: 10,
      taxRatePct: 5,
      isOtc: true,
      description: 'Fictional demonstration soothing topical gel.',
    },
    {
      sku: 'MED-RESP-100',
      name: 'RespiraClear Herbal Syrup',
      genericName: 'Fictional Thymol Expectorant',
      categoryId: catMap.get('allergy-sinus')._id,
      primarySupplierId: supVita._id,
      dosageForm: 'Syrup',
      strength: '100ml Bottle',
      manufacturer: 'Crestline Demo Pharma',
      unit: 'bottle',
      reorderLevel: 18,
      taxRatePct: 5,
      isOtc: true,
      description: 'Fictional demonstration throat and chest syrup.',
    },
    {
      sku: 'MED-NVC-250',
      name: 'Novacillin Broad 250mg',
      genericName: 'Fictional Amoxyclavine',
      categoryId: catMap.get('antibiotics')._id,
      primarySupplierId: supApex._id,
      dosageForm: 'Capsule',
      strength: '250mg (10s)',
      manufacturer: 'Helios Fictional Labs',
      unit: 'strip',
      reorderLevel: 15,
      taxRatePct: 12,
      isOtc: false,
      description: 'Fictional POS-only antimicrobial demonstration item (not for online self-checkout).',
    },
    {
      sku: 'MED-AID-KIT',
      name: 'MediPatch Hydrocolloid',
      genericName: 'Fictional Sterile Dressing',
      categoryId: catMap.get('first-aid-topical')._id,
      primarySupplierId: supNova._id,
      dosageForm: 'Patch',
      strength: '12 Patches',
      manufacturer: 'AuraCare Fictional',
      unit: 'box',
      reorderLevel: 15,
      taxRatePct: 5,
      isOtc: true,
      description: 'Fictional demonstration sterile wound dressing pack.',
    },
  ]);

  const medBySku = new Map(medicines.map((m) => [m.sku, m]));

  // Create batches covering:
  // 1) Multiple FEFO batches (near-expiry + later expiry)
  // 2) An expired batch with stock on hand (cannot be sold!)
  // 3) Low-stock medicines (<= reorderLevel)
  const batchSeeds = [
    // MediCalm: 2 active batches -> earlier expiry (18 days) should be allocated first by FEFO!
    {
      sku: 'MED-CALM-500',
      supplier: supApex,
      batchNumber: 'MC-2026-A1',
      expiryDate: daysFromNow(18),
      quantity: 25,
      purchasePrice: 32.0,
      salePrice: 55.0,
      status: 'active',
    },
    {
      sku: 'MED-CALM-500',
      supplier: supApex,
      batchNumber: 'MC-2027-B2',
      expiryDate: daysFromNow(240),
      quantity: 80,
      purchasePrice: 34.0,
      salePrice: 55.0,
      status: 'active',
    },
    // AllerShield: 1 expired batch (demonstrates block + alert) + 1 active batch
    {
      sku: 'MED-ALR-10',
      supplier: supNova,
      batchNumber: 'AS-EXP-001',
      expiryDate: daysFromNow(-12),
      quantity: 14,
      purchasePrice: 40.0,
      salePrice: 70.0,
      status: 'expired',
    },
    {
      sku: 'MED-ALR-10',
      supplier: supNova,
      batchNumber: 'AS-2027-C1',
      expiryDate: daysFromNow(180),
      quantity: 50,
      purchasePrice: 42.0,
      salePrice: 70.0,
      status: 'active',
    },
    // GastroEase: near-expiry + low stock (12 <= 15 reorderLevel)
    {
      sku: 'MED-GAS-20',
      supplier: supApex,
      batchNumber: 'GE-2026-N1',
      expiryDate: daysFromNow(22),
      quantity: 12,
      purchasePrice: 65.0,
      salePrice: 110.0,
      status: 'active',
    },
    // VitaBoost: healthy stock
    {
      sku: 'MED-VIT-D3',
      supplier: supVita,
      batchNumber: 'VB-2027-V1',
      expiryDate: daysFromNow(320),
      quantity: 60,
      purchasePrice: 95.0,
      salePrice: 160.0,
      status: 'active',
    },
    // DermaSoothe: healthy stock
    {
      sku: 'MED-DERM-30',
      supplier: supNova,
      batchNumber: 'DS-2027-D1',
      expiryDate: daysFromNow(200),
      quantity: 35,
      purchasePrice: 50.0,
      salePrice: 85.0,
      status: 'active',
    },
    // RespiraClear: LOW STOCK (8 <= 18 reorderLevel)
    {
      sku: 'MED-RESP-100',
      supplier: supVita,
      batchNumber: 'RC-2027-R1',
      expiryDate: daysFromNow(150),
      quantity: 8,
      purchasePrice: 48.0,
      salePrice: 80.0,
      status: 'active',
    },
    // Novacillin (POS-only): active stock
    {
      sku: 'MED-NVC-250',
      supplier: supApex,
      batchNumber: 'NV-2027-P1',
      expiryDate: daysFromNow(210),
      quantity: 40,
      purchasePrice: 78.0,
      salePrice: 130.0,
      status: 'active',
    },
    // MediPatch: healthy stock
    {
      sku: 'MED-AID-KIT',
      supplier: supNova,
      batchNumber: 'MP-2027-K1',
      expiryDate: daysFromNow(360),
      quantity: 45,
      purchasePrice: 45.0,
      salePrice: 75.0,
      status: 'active',
    },
  ];

  const createdBatches = await Batch.create(
    batchSeeds.map((b) => ({
      medicineId: medBySku.get(b.sku)._id,
      supplierId: b.supplier._id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      receivedAt: daysFromNow(-30),
      initialQuantity: b.quantity,
      quantityOnHand: b.quantity,
      purchasePrice: b.purchasePrice,
      salePrice: b.salePrice,
      status: b.status,
    }))
  );

  // Record OPENING stock movements so Stock Reconciliation Report balances to 0 variance
  await StockMovement.create(
    createdBatches.map((batch) => ({
      medicineId: batch.medicineId,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      movementType: 'OPENING',
      quantityDelta: batch.initialQuantity,
      balanceBefore: 0,
      balanceAfter: batch.initialQuantity,
      unitCost: batch.purchasePrice,
      referenceType: 'SEED',
      referenceId: batch._id,
      referenceCode: 'SEED-OPENING',
      reason: 'Initial opening inventory seed',
      performedBy: adminUser._id,
    }))
  );

  // Create 2 realistic sample sales using the live saleService (so FEFO + StockMovements are authentic)
  await createSale({
    items: [
      { medicineId: String(medBySku.get('MED-CALM-500')._id), quantity: 4 },
      { medicineId: String(medBySku.get('MED-VIT-D3')._id), quantity: 2 },
    ],
    customerName: 'Walk-in Demo Patient',
    customerPhone: '+91 98765 01044',
    paymentMethod: 'CARD',
    notes: 'Seeded POS demonstration sale',
    actor: pharmacistUser,
  });

  await createSale({
    items: [
      { medicineId: String(medBySku.get('MED-DERM-30')._id), quantity: 1 },
      { medicineId: String(medBySku.get('MED-AID-KIT')._id), quantity: 2 },
    ],
    paymentMethod: 'ONLINE',
    notes: 'Seeded customer online order',
    actor: customerUser,
  });

  await AuditLog.create({
    actorId: adminUser._id,
    actorEmail: adminUser.email,
    actorRole: adminUser.role,
    action: 'DATABASE_SEEDED',
    entityType: 'System',
    summary: 'Seeded fictional Medilo pharmacy catalog, batches, users, and sample transactions',
  });

  return {
    skipped: false,
    counts: {
      users: 3,
      categories: categories.length,
      suppliers: suppliers.length,
      medicines: medicines.length,
      batches: createdBatches.length,
    },
  };
};
