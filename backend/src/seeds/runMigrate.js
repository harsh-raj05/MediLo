import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
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

const models = [
  User,
  Category,
  Supplier,
  Medicine,
  Batch,
  Purchase,
  Sale,
  ReturnRecord,
  StockMovement,
  AuditLog,
  IdempotencyKey,
];

const run = async () => {
  try {
    await connectDB(env.mongodbUri);
    for (const model of models) {
      await model.syncIndexes();
      console.log(`Synced indexes for ${model.modelName}`);
    }
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Migration / index sync failed:', err);
    process.exit(1);
  }
};

run();
