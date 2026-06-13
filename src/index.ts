import { loadConfig } from './config/index.js';
import { buildServer } from './api/server.js';
import { connectRedis, disconnectRedis } from './lib/redis.js';
import { disconnectPrisma } from './lib/prisma.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildServer(config);

  await connectRedis();

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`AlgoTrader listening on ${config.host}:${config.port}`);

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down`);
    await app.close();
    await disconnectRedis();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
