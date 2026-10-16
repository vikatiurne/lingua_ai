import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCacheGet, mockCacheSet, mockComplete } = vi.hoisted(() => ({
  mockCacheGet: vi.fn(),
  mockCacheSet: vi.fn(),
  mockComplete: vi.fn(),
}));

vi.mock("./fallback", () => ({
  completeWithFallback: mockComplete,
}));

vi.mock("../redis/cache", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../redis/cache")>();
  return {
    ...actual,
    cacheGet: mockCacheGet,
    cacheSet: mockCacheSet,
  };
});

import { completeCached } from "./cached";
import type { AICompletionResult, AIMessage } from "./types";

const messages: AIMessage[] = [{ role: "user", content: "Hello" }];

function makeResult(text = "hi"): AICompletionResult {
  return {
    text,
    provider: "openrouter",
    model: "test-model",
    latencyMs: 10,
  };
}

function setKey(callIndex: number): string {
  const call = mockCacheSet.mock.calls[callIndex];
  if (!call) throw new Error(`no cacheSet call at index ${callIndex}`);
  return call[0] as string;
}

describe("completeCached", () => {
  beforeEach(() => {
    mockCacheGet.mockReset();
    mockCacheSet.mockReset();
    mockComplete.mockReset();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockComplete.mockResolvedValue(makeResult());
  });

  it("cache miss calls completeWithFallback and returns cached: false", async () => {
    const result = await completeCached(messages);

    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(result.cached).toBe(false);
    expect(result.text).toBe("hi");
    expect(mockCacheSet).toHaveBeenCalledTimes(1);
  });

  it("cache hit returns cached value without calling completeWithFallback", async () => {
    mockCacheGet.mockResolvedValue(makeResult("from-cache"));

    const result = await completeCached(messages);

    expect(mockComplete).not.toHaveBeenCalled();
    expect(result.cached).toBe(true);
    expect(result.text).toBe("from-cache");
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it("key includes model, temperature and responseFormat", async () => {
    await completeCached(messages, {
      model: "m1",
      temperature: 0.7,
      responseFormat: "json",
    });
    await completeCached(messages, {
      model: "m2",
      temperature: 0.7,
      responseFormat: "json",
    });

    const key1 = setKey(0);
    const key2 = setKey(1);

    expect(key1).toMatch(/^ai:[0-9a-f]{64}$/);
    expect(key1).not.toBe(key2);
  });

  it("different messages produce different keys", async () => {
    await completeCached([{ role: "user", content: "one" }]);
    await completeCached([{ role: "user", content: "two" }]);

    const key1 = setKey(0);
    const key2 = setKey(1);

    expect(key1).not.toBe(key2);
  });

  it("timeoutMs does not affect the key", async () => {
    await completeCached(messages, { timeoutMs: 1000 });
    await completeCached(messages, { timeoutMs: 5000 });

    const key1 = setKey(0);
    const key2 = setKey(1);

    expect(key1).toBe(key2);
  });

  it("cacheTtlSeconds: 0 skips cache read and write", async () => {
    const result = await completeCached(messages, { cacheTtlSeconds: 0 });

    expect(mockCacheGet).not.toHaveBeenCalled();
    expect(mockCacheSet).not.toHaveBeenCalled();
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(result.cached).toBe(false);
  });
});
