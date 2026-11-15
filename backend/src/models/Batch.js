import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      uppercase: true,
      trim: true,
      maxlength: 60,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    initialQuantity: {
      type: Number,
      required: true,
      min: [0, 'Initial quantity cannot be negative'],
    },
    quantityOnHand: {
      type: Number,
      required: true,
      min: [0, 'Quantity on hand cannot be negative'],
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: [0, 'Purchase price cannot be negative'],
    },
    salePrice: {
      type: Number,
      required: true,
      min: [0, 'Sale price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'quarantined', 'expired', 'depleted'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

// Unique batch per medicine
batchSchema.index({ medicineId: 1, batchNumber: 1 }, { unique: true });
// FEFO allocation lookup index
batchSchema.index({ medicineId: 1, status: 1, expiryDate: 1, quantityOnHand: 1 });

export const Batch = mongoose.model('Batch', batchSchema);
