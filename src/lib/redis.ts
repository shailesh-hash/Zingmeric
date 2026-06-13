import { Redis } from 'ioredis';

let redis: Redis | undefined;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    redis = new Redis(url, {
      maxRetriesPerRequest: null,
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  await pingRedis();
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = undefined;
  }
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedis();
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
