import mongoose from 'mongoose';

export const MOVEMENT_TYPES = [
  'OPENING',
  'PURCHASE',
  'SALE',
  'SALE_RETURN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
];

const stockMovementSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
    },
    movementType: {
      type: String,
      enum: MOVEMENT_TYPES,
      required: true,
      index: true,
    },
    quantityDelta: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    referenceType: {
      type: String,
      enum: ['SEED', 'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT'],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referenceCode: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Movement reason is required'],
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ medicineId: 1, createdAt: 1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
