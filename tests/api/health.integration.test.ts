import { loadConfig } from '../../src/config/index.js';
import { buildServer } from '../../src/api/server.js';
import { connectRedis, disconnectRedis } from '../../src/lib/redis.js';
import { disconnectPrisma } from '../../src/lib/prisma.js';

const hasIntegrationServices =
  process.env.RUN_INTEGRATION_TESTS === 'true' || process.env.CI === 'true';

const describeIntegration = hasIntegrationServices ? describe : describe.skip;

describeIntegration('Health integration', () => {
  beforeAll(async () => {
    await connectRedis();
  });

  afterAll(async () => {
    await disconnectRedis();
    await disconnectPrisma();
  });

  it('reports healthy when postgres and redis are available', async () => {
    const app = await buildServer(loadConfig());
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      services: { database: 'up', redis: 'up' },
    });

    await app.close();
  });

  it('reports ready when dependencies are connected', async () => {
    const app = await buildServer(loadConfig());
    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ready: true });

    await app.close();
  });
});
