import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openApiSpec } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.corsOrigin === '*') return callback(null, true);
        const configured = env.corsOrigin.split(',').map((s) => s.trim());
        const allowed = [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'https://medi-lo.vercel.app',
          ...configured,
        ];
        if (origin.endsWith('.vercel.app') || allowed.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Fallback allow in production to prevent user lock-out
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  if (env.nodeEnv !== 'test') {
    app.use(morgan('dev'));
    app.use(
      '/api/v1/auth/login',
      rateLimit({
        windowMs: 60 * 1000,
        max: 40,
        standardHeaders: true,
        legacyHeaders: false,
      })
    );
  }

  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use('/api/v1', apiRoutes);

  // Serve compiled production frontend if deployed together
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
