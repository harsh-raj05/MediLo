import mongoose from 'mongoose';

export const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Cream',
  'Drops',
  'Inhaler',
  'Injection',
  'Ointment',
  'Powder',
  'Patch',
  'Medical Supply',
];

const medicineSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
    },
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      maxlength: 140,
      index: true,
    },
    genericName: {
      type: String,
      required: [true, 'Generic name is required'],
      trim: true,
      maxlength: 140,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    primarySupplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    dosageForm: {
      type: String,
      enum: DOSAGE_FORMS,
      required: true,
    },
    strength: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    manufacturer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    unit: {
      type: String,
      trim: true,
      default: 'pack',
    },
    reorderLevel: {
      type: Number,
      min: 0,
      default: 15,
    },
    taxRatePct: {
      type: Number,
      min: 0,
      max: 50,
      default: 5,
    },
    isOtc: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    storageInstructions: {
      type: String,
      trim: true,
      default: 'Store in a cool, dry place below 25C.',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

medicineSchema.index({ name: 'text', genericName: 'text', sku: 'text', manufacturer: 'text' });

export const Medicine = mongoose.model('Medicine', medicineSchema);
