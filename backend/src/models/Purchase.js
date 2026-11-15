import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicineName: { type: String, required: true },
    sku: { type: String, required: true },
    batchNumber: { type: String, required: true, uppercase: true, trim: true },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    lineCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplierInvoiceNumber: {
      type: String,
      required: [true, 'Supplier invoice number is required'],
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    items: {
      type: [purchaseItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one purchase item is required'],
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
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

export const Purchase = mongoose.model('Purchase', purchaseSchema);
