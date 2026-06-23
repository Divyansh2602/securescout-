import Redis from 'ioredis';
import { RedisStore } from 'rate-limit-redis';
import type { Store } from 'express-rate-limit';
import { config } from './env';
import { logger } from '../utils/logger';

// Use a shared Redis store only when REDIS_URL points at a real server.
// Local dev defaults to redis://localhost:6379 (often nothing listening), so we
// fall back to express-rate-limit's in-memory store there instead of spamming
// connection errors.
export const useRedisStore = !/localhost|127\.0\.0\.1/.test(config.REDIS_URL);

export const redis: Redis | null = useRedisStore
  ? new Redis(config.REDIS_URL, {
      // Keep commands queuing briefly across blips rather than hard-failing
      // requests; Upstash is reachable over rediss:// (TLS auto-enabled by URL).
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })
  : null;

if (redis) {
  redis.on('connect', () => logger.info('✅ Redis connected (rate-limit store)'));
  redis.on('error', (e) => logger.error('Redis error:', e.message));
}

/**
 * Build a Redis-backed rate-limit store for the given key prefix, or `undefined`
 * to let express-rate-limit use its default in-memory store (local dev).
 */
export function makeRateLimitStore(prefix: string): Store | undefined {
  if (!redis) return undefined;
  return new RedisStore({
    prefix,
    // ioredis: first arg is the command, rest are its arguments.
    sendCommand: (command: string, ...args: string[]) =>
      (redis as Redis).call(command, ...args) as Promise<any>,
  });
}
