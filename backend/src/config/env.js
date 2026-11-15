import dotenv from 'dotenv';

dotenv.config();

const toInt = (val, fallback) => {
  const parsed = Number.parseInt(val, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medilo_pharmacy',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-medilo-pharmacy-secret-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  lowStockDefault: toInt(process.env.LOW_STOCK_DEFAULT, 15),
  nearExpiryDays: toInt(process.env.NEAR_EXPIRY_DAYS, 30),
};
