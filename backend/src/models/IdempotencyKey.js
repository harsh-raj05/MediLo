import mongoose from 'mongoose';

const idempotencyKeySchema = new mongoose.Schema({
  key: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  route: { type: String, required: true },
  requestHash: { type: String, required: true },
  statusCode: { type: Number, required: true },
  responseBody: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 },
});

idempotencyKeySchema.index({ key: 1, userId: 1, route: 1 }, { unique: true });

export const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);
