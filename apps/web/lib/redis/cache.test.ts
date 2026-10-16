import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet, mockSet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
}));

vi.mock("ioredis", () => {
  class MockRedis {
    status = "ready";
    on = vi.fn().mockReturnThis();
    get = mockGet;
    set = mockSet;
  }
  return { default: MockRedis };
});

import { hashPrompt, cacheGet, cacheSet, withCache } from "./cache";

describe("hashPrompt", () => {
  it("is deterministic and returns 64 hex chars", () => {
    const hash = hashPrompt("abc");
    expect(hash).toBe(hashPrompt("abc"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different inputs", () => {
    expect(hashPrompt("abc")).not.toBe(hashPrompt("abd"));
  });
});

describe("cacheGet / cacheSet", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it("round-trips a value", async () => {
    const value = { text: "hello", cached: false };
    mockSet.mockResolvedValue("OK");
    mockGet.mockResolvedValue(JSON.stringify(value));

    await cacheSet("ai:key", value, 60);
    expect(mockSet).toHaveBeenCalledWith(
      "ai:key",
      JSON.stringify(value),
      "EX",
      60
    );

    const result = await cacheGet<typeof value>("ai:key");
    expect(result).toEqual(value);
  });

  it("returns null on Redis get error without throwing", async () => {
    mockGet.mockRejectedValue(new Error("connection refused"));
    await expect(cacheGet("ai:key")).resolves.toBeNull();
  });

  it("does not throw on Redis set error", async () => {
    mockSet.mockRejectedValue(new Error("read-only"));
    await expect(cacheSet("ai:key", { a: 1 }, 60)).resolves.toBeUndefined();
  });

  it("returns null on invalid JSON without throwing", async () => {
    mockGet.mockResolvedValue("{not-json");
    await expect(cacheGet("ai:key")).resolves.toBeNull();
  });
});

describe("withCache", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it("returns cached value without calling fn on cache hit", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ value: 42 }));
    const fn = vi.fn();

    const result = await withCache("ai:key", 60, fn);

    expect(result).toEqual({ value: 42 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("calls fn and caches result on cache miss", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const fn = vi.fn().mockResolvedValue({ value: 42 });

    const result = await withCache("ai:key", 60, fn);

    expect(result).toEqual({ value: 42 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      "ai:key",
      JSON.stringify({ value: 42 }),
      "EX",
      60
    );
  });
});
