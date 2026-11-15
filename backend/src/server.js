import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { seedDatabase } from './seeds/seedData.js';

const start = async () => {
  try {
    await connectDB(env.mongodbUri);

    // Auto-seed demo catalog and accounts on initial launch if admin does not exist
    const adminExists = await User.findOne({ email: 'admin@medilo.demo' });
    if (!adminExists) {
      console.log('Database missing default accounts: seeding initial Medilo pharmacy catalog and demo accounts...');
      await seedDatabase();
      console.log('Database seeded successfully.');
    }

    const app = createApp();
    app.listen(env.port, () => {
      console.log(`Medilo Pharmacy API listening on http://localhost:${env.port}`);
      console.log(`Swagger API Docs available at http://localhost:${env.port}/api/docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
