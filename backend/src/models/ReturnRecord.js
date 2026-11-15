import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicineName: { type: String, required: true },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRatePct: { type: Number, required: true, min: 0 },
    refundSubtotal: { type: Number, required: true, min: 0 },
    refundTax: { type: Number, required: true, min: 0 },
    refundTotal: { type: Number, required: true, min: 0 },
    restocked: { type: Boolean, required: true },
  },
  { _id: false }
);

const returnRecordSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Return reason is required'],
      trim: true,
      minlength: [5, 'Return reason must be at least 5 characters'],
    },
    condition: {
      type: String,
      enum: ['RESTOCKABLE', 'DAMAGED'],
      default: 'RESTOCKABLE',
    },
    items: {
      type: [returnItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one return item is required'],
    },
    totalRefund: {
      type: Number,
      required: true,
      min: 0,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export const ReturnRecord = mongoose.model('ReturnRecord', returnRecordSchema);
