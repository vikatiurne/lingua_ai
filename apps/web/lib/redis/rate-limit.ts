import { isRedisAvailable, redis } from "./client";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

export const RATE_LIMITS = {
  AI: { limit: 10, windowSeconds: 60, keyPrefix: "ai" },
  API: { limit: 100, windowSeconds: 60, keyPrefix: "api" },
  AUTH: { limit: 5, windowSeconds: 60, keyPrefix: "auth" },
} as const;

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!isRedisAvailable()) {
    return { allowed: true, limit, remaining: limit, resetAt: 0 };
  }

  try {
    const currentCount = await redis.incr(key);
    if (currentCount === 1) {
      await redis.expire(key, windowSeconds);
    }
    const ttl = await redis.ttl(key);
    const resetAt = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);

    if (currentCount <= limit) {
      return {
        allowed: true,
        limit,
        remaining: Math.max(limit - currentCount, 0),
        resetAt,
      };
    }
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt,
      retryAfter: Math.max(ttl, 1),
    };
  } catch (err) {
    console.warn("[redis] rate limit check failed:", err);
    return { allowed: true, limit, remaining: limit, resetAt: 0 };
  }
}
