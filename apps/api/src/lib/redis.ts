import Redis from "ioredis";
import { getEnv } from "../config/env.js";

let redis: Redis | null = null;

/**
 * Get the singleton Redis client instance.
 * Lazily creates the connection on first call.
 */
export function getRedis(): Redis {
  if (!redis) {
    const env = getEnv();
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
      lazyConnect: false,
    });

    redis.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    redis.on("connect", () => {
      console.log("[Redis] Connected successfully");
    });

    redis.on("reconnecting", () => {
      console.log("[Redis] Reconnecting...");
    });
  }
  return redis;
}

/**
 * Get cached data or compute and cache it.
 * Returns parsed JSON data from cache, or computes via `fn` and caches.
 */
export async function getCachedOrCompute<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = 3600
): Promise<{ data: T; cachedAt: string; fromCache: boolean }> {
  const client = getRedis();

  // Try cache first
  const cached = await client.get(key);
  if (cached) {
    const parsed = JSON.parse(cached) as { data: T; cachedAt: string };
    return { ...parsed, fromCache: true };
  }

  // Compute fresh data
  const data = await fn();
  const cachedAt = new Date().toISOString();
  const payload = JSON.stringify({ data, cachedAt });

  await client.setex(key, ttlSeconds, payload);

  return { data, cachedAt, fromCache: false };
}

/**
 * Invalidate all ranking caches.
 */
export async function invalidateRankingCaches(): Promise<void> {
  const client = getRedis();
  const keys = await client.keys("ranking:*");
  if (keys.length > 0) {
    await client.del(...keys);
  }
}
