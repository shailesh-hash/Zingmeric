import { loadConfig } from '../../src/config/index.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads config from environment variables', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.PORT = '4000';
    process.env.HOST = '127.0.0.1';
    process.env.NODE_ENV = 'test';

    const config = loadConfig();

    expect(config).toEqual({
      nodeEnv: 'test',
      port: 4000,
      host: '127.0.0.1',
      databaseUrl: 'postgresql://test:test@localhost:5432/test',
      redisUrl: 'redis://localhost:6379',
    });
  });

  it('uses defaults for optional values', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.HOST;
    delete process.env.REDIS_URL;

    const config = loadConfig();

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.redisUrl).toBe('redis://localhost:6379');
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;

    expect(() => loadConfig()).toThrow('Missing required environment variable: DATABASE_URL');
  });
});
