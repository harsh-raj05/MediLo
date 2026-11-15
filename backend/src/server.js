import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const start = async () => {
  try {
    await connectDB(env.mongodbUri);
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
