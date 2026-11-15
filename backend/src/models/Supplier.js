import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Supplier code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: 140,
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Supplier phone is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    taxId: {
      type: String,
      trim: true,
      default: '',
    },
    paymentTermsDays: {
      type: Number,
      min: 0,
      max: 365,
      default: 30,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Supplier = mongoose.model('Supplier', supplierSchema);
