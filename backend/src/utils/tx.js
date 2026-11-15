import mongoose from 'mongoose';
import { isTransactionSupported } from '../config/db.js';

/**
 * Runs a database operation inside a MongoDB ACID transaction when connected
 * to a replica set or mongos, and falls back to session-less execution with
 * atomic conditional updates ($gte / rollback) on standalone MongoDB instances.
 */
export const runInTransaction = async (work) => {
  if (isTransactionSupported()) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
  return work(null);
};

export const withSession = (session) => (session ? { session } : {});
