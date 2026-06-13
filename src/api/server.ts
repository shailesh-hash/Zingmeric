import cors from '@fastify/cors';
import { FastifyOtelInstrumentation } from '@fastify/otel';
import Fastify from 'fastify';
import type { AppConfig } from '../config/index.js';
import { isObservabilityEnabled } from '../observability/instrumentation.js';
import { registerPrometheusMetricsMiddleware } from '../observability/metrics/middleware/prometheus-metrics.middleware.js';
import { registerPrometheusMetrics } from '../observability/metrics/prometheus-metrics.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerBacktestAnalyticsRoutes } from './routes/backtest-analytics.routes.js';
import { registerHealthRoutes } from './routes/health.js';
import type { BacktestAnalyticsRouteDeps } from './routes/backtest-analytics.routes.js';

export interface BuildServerOptions {
  backtestAnalytics?: BacktestAnalyticsRouteDeps;
}

export async function buildServer(config: AppConfig, options: BuildServerOptions = {}) {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  registerPrometheusMetrics();
  registerPrometheusMetricsMiddleware(app);

  if (isObservabilityEnabled()) {
    await app.register(new FastifyOtelInstrumentation().plugin());
  }

  await app.register(cors, { origin: true });
  registerHealthRoutes(app);
  registerAnalyticsRoutes(app);
  registerBacktestAnalyticsRoutes(app, options.backtestAnalytics);

  app.get('/', () => ({
    name: 'AlgoTrader',
    version: '0.1.0',
    status: 'running',
  }));

  return app;
}
