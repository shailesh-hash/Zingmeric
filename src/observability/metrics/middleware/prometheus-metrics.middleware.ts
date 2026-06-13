import type { FastifyInstance } from 'fastify';
import { getMetricsContentType, getMetricsPayload } from '../metric-registry.js';

export function registerPrometheusMetricsMiddleware(app: FastifyInstance): void {
  app.get('/metrics', async (_request, reply) => {
    const payload = await getMetricsPayload();

    return reply.type(getMetricsContentType()).send(payload);
  });
}
