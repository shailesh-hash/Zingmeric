import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { AppConfig } from '../config/index.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerHealthRoutes } from './routes/health.js';

export async function buildServer(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  await app.register(cors, { origin: true });
  registerHealthRoutes(app);
  registerAnalyticsRoutes(app);

  app.get('/', () => ({
    name: 'AlgoTrader',
    version: '0.1.0',
    status: 'running',
  }));

  return app;
}
