import mongoose from 'mongoose';

let supportsTransactions = false;

export const isTransactionSupported = () => supportsTransactions;

export const detectTransactionSupport = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const hello = await admin.command({ hello: 1 });
    supportsTransactions = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    supportsTransactions = false;
  }
  return supportsTransactions;
};

export const connectDB = async (uri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  await detectTransactionSupport();
  return mongoose.connection;
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};
