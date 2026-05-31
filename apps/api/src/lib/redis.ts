// apps/api/src/lib/redis.ts

import { Redis } from "ioredis";
import { loadEnv } from "../config/env.js";

let client: Redis | null = null;

/**
 * Returns a Redis client when REDIS_URL is configured; otherwise null (in-memory fallback in services).
 */
export function getRedis(): Redis | null {
  if (client) {
    return client;
  }

  const env = loadEnv();
  if (!env.REDIS_URL) {
    return null;
  }

  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  return client;
}

/** Session / refresh-token key prefix (multi-tenant by userId). */
export const redisKeys = {
  refreshToken: (userId: string, jti: string) =>
    `session:refresh:${userId}:${jti}`,
} as const;
