import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { pingRedis } from '../../lib/redis.js';
import type { HealthStatus, LivenessResponse, ReadinessResponse } from '../types/health.js';

async function checkDatabase(): Promise<'up' | 'down'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'up';
  } catch {
    return 'down';
  }
}

async function checkRedis(): Promise<'up' | 'down'> {
  try {
    const isUp = await pingRedis();
    return isUp ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', async (): Promise<HealthStatus> => {
    const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
    const allUp = database === 'up' && redis === 'up';

    return {
      status: allUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { database, redis },
    };
  });

  app.get('/health/live', (): LivenessResponse => ({ alive: true }));

  app.get('/health/ready', async (): Promise<ReadinessResponse> => {
    const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
    return { ready: database === 'up' && redis === 'up' };
  });
}
