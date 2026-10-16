import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockIncr, mockExpire, mockTtl, redisState } = vi.hoisted(() => ({
  mockIncr: vi.fn(),
  mockExpire: vi.fn(),
  mockTtl: vi.fn(),
  redisState: { status: "ready" as string },
}));

vi.mock("ioredis", () => {
  class MockRedis {
    get status() {
      return redisState.status;
    }
    on = vi.fn().mockReturnThis();
    incr = mockIncr;
    expire = mockExpire;
    ttl = mockTtl;
  }
  return { default: MockRedis };
});

import { RATE_LIMITS, checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    mockIncr.mockReset();
    mockExpire.mockReset();
    mockTtl.mockReset();
    redisState.status = "ready";
  });

  it("first request is allowed with remaining = limit - 1", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
    mockTtl.mockResolvedValue(60);

    const result = await checkRateLimit("ratelimit:ai:1.2.3.4", 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
  });

  it("request over the limit is rejected with retryAfter > 0", async () => {
    mockIncr.mockResolvedValue(11);
    mockTtl.mockResolvedValue(42);

    const result = await checkRateLimit("ratelimit:ai:1.2.3.4", 10, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(42);
  });

  it("sets EXPIRE only when INCR returns 1", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
    mockTtl.mockResolvedValue(60);

    await checkRateLimit("ratelimit:api:key", 100, 60);
    expect(mockExpire).toHaveBeenCalledTimes(1);
    expect(mockExpire).toHaveBeenCalledWith("ratelimit:api:key", 60);

    mockIncr.mockResolvedValue(2);
    await checkRateLimit("ratelimit:api:key", 100, 60);
    expect(mockExpire).toHaveBeenCalledTimes(1);
  });

  it("fails open when Redis is unavailable", async () => {
    redisState.status = "disconnect";

    const result = await checkRateLimit("ratelimit:ai:1.2.3.4", 10, 60);

    expect(result).toEqual({
      allowed: true,
      limit: 10,
      remaining: 10,
      resetAt: 0,
    });
    expect(mockIncr).not.toHaveBeenCalled();
  });

  it("fails open when Redis command throws", async () => {
    mockIncr.mockRejectedValue(new Error("connection refused"));

    const result = await checkRateLimit("ratelimit:ai:1.2.3.4", 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
    expect(result.resetAt).toBe(0);
  });

  it("returns a future resetAt timestamp", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
    mockTtl.mockResolvedValue(60);

    const before = Math.floor(Date.now() / 1000);
    const result = await checkRateLimit("ratelimit:ai:key", 10, 60);

    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60);
  });

  it("does not mix keys with different prefixes", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
    mockTtl.mockResolvedValue(60);

    await checkRateLimit("ratelimit:ai:1.2.3.4", 10, 60);
    await checkRateLimit("ratelimit:auth:1.2.3.4", 5, 60);

    expect(mockIncr).toHaveBeenNthCalledWith(1, "ratelimit:ai:1.2.3.4");
    expect(mockIncr).toHaveBeenNthCalledWith(2, "ratelimit:auth:1.2.3.4");
  });
});

describe("RATE_LIMITS", () => {
  it("defines AI, API and AUTH limits", () => {
    expect(RATE_LIMITS.AI).toEqual({
      limit: 10,
      windowSeconds: 60,
      keyPrefix: "ai",
    });
    expect(RATE_LIMITS.API).toEqual({
      limit: 100,
      windowSeconds: 60,
      keyPrefix: "api",
    });
    expect(RATE_LIMITS.AUTH).toEqual({
      limit: 5,
      windowSeconds: 60,
      keyPrefix: "auth",
    });
  });
});
