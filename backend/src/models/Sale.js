import mongoose from 'mongoose';

const batchAllocationSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    batchNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 1 },
    returnedQuantity: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    lineSubtotal: { type: Number, required: true, min: 0 },
    lineTax: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicineName: { type: String, required: true },
    sku: { type: String, required: true },
    requestedQuantity: { type: Number, required: true, min: 1 },
    returnedQuantity: { type: Number, default: 0, min: 0 },
    taxRatePct: { type: Number, required: true, min: 0 },
    allocations: {
      type: [batchAllocationSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'Batch allocation required'],
    },
    itemSubtotal: { type: Number, required: true, min: 0 },
    itemTax: { type: Number, required: true, min: 0 },
    itemTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    saleType: {
      type: String,
      enum: ['POS', 'ONLINE_ORDER'],
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [saleItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one sale item is required'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI', 'ONLINE'],
      default: 'CASH',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PARTIALLY_RETURNED', 'RETURNED'],
      default: 'COMPLETED',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });

export const Sale = mongoose.model('Sale', saleSchema);
