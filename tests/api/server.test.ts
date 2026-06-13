import { loadConfig } from '../../src/config/index.js';
import { buildServer } from '../../src/api/server.js';

describe('API server', () => {
  it('returns service metadata on root route', async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://algotrader:algotrader@localhost:5432/algotrader';

    const app = await buildServer(loadConfig());
    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      name: 'AlgoTrader',
      version: '0.1.0',
      status: 'running',
    });

    await app.close();
  });

  it('returns liveness without external dependencies', async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://algotrader:algotrader@localhost:5432/algotrader';

    const app = await buildServer(loadConfig());
    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ alive: true });

    await app.close();
  });
});
