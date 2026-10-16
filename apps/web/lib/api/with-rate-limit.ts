import type { NextRequest } from "next/server";
import { checkRateLimit } from "../redis/rate-limit";

export type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
  identifier?: (req: NextRequest) => string;
};

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  options: RateLimitOptions
): (req: NextRequest) => Promise<Response> {
  return async (req: NextRequest) => {
    const identifier = options.identifier?.(req) ?? getClientIp(req);
    const key = `ratelimit:${options.keyPrefix}:${identifier}`;
    const result = await checkRateLimit(
      key,
      options.limit,
      options.windowSeconds
    );

    const headers = new Headers();
    headers.set("X-RateLimit-Limit", String(result.limit));
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    headers.set("X-RateLimit-Reset", String(result.resetAt));

    if (!result.allowed) {
      headers.set("Retry-After", String(result.retryAfter ?? 60));
      return new Response("Too Many Requests", { status: 429, headers });
    }

    const response = await handler(req);
    const merged = new Headers(response.headers);
    headers.forEach((value, name) => merged.set(name, value));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: merged,
    });
  };
}
