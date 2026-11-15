import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { seedDatabase } from './seedData.js';

const reset = process.argv.includes('--reset');

const run = async () => {
  try {
    await connectDB(env.mongodbUri);
    const result = await seedDatabase({ reset });
    console.log('Seed result:', JSON.stringify(result, null, 2));
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

run();
