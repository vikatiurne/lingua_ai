import { createHash } from "node:crypto";
import { isRedisAvailable, redis } from "./client";

export const DEFAULT_CACHE_TTL_SECONDS = 86400;

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn("[redis] get/parse failed:", err);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_CACHE_TTL_SECONDS
): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.warn("[redis] set failed:", err);
  }
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const result = await fn();
  await cacheSet(key, result, ttlSeconds);
  return result;
}
