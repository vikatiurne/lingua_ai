import { completeWithFallback } from "./fallback";
import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from "./types";
import {
  DEFAULT_CACHE_TTL_SECONDS,
  cacheGet,
  cacheSet,
  hashPrompt,
} from "../redis/cache";

export type CachedCompletionResult = AICompletionResult & {
  cached: boolean;
};

function buildCacheKey(
  messages: AIMessage[],
  options?: AICompletionOptions
): string {
  const relevant = {
    messages,
    model: options?.model,
    temperature: options?.temperature,
    responseFormat: options?.responseFormat,
  };
  return `ai:${hashPrompt(JSON.stringify(relevant))}`;
}

export async function completeCached(
  messages: AIMessage[],
  options?: AICompletionOptions & { cacheTtlSeconds?: number }
): Promise<CachedCompletionResult> {
  const ttl = options?.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  if (ttl <= 0) {
    const result = await completeWithFallback(messages, options);
    return { ...result, cached: false };
  }

  const key = buildCacheKey(messages, options);
  const hit = await cacheGet<AICompletionResult>(key);
  if (hit !== null) return { ...hit, cached: true };

  const result = await completeWithFallback(messages, options);
  await cacheSet(key, result, ttl);
  return { ...result, cached: false };
}
