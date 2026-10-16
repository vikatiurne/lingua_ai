import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { mockCheckRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("../redis/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

import { getClientIp, withRateLimit } from "./with-rate-limit";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

const allowedResult = {
  allowed: true,
  limit: 10,
  remaining: 9,
  resetAt: 1712345678,
};

const blockedResult = {
  allowed: false,
  limit: 10,
  remaining: 0,
  resetAt: 1712345678,
  retryAfter: 42,
};

const options = { limit: 10, windowSeconds: 60, keyPrefix: "ai" };

describe("withRateLimit", () => {
  beforeEach(() => {
    mockCheckRateLimit.mockReset();
  });

  it("calls handler and adds rate limit headers on success", async () => {
    mockCheckRateLimit.mockResolvedValue(allowedResult);
    const handler = vi
      .fn()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const wrapped = withRateLimit(handler, options);
    const response = await wrapped(makeRequest());

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("9");
    expect(response.headers.get("X-RateLimit-Reset")).toBe("1712345678");
    expect(response.headers.get("Retry-After")).toBeNull();
  });

  it("returns 429 without calling handler when not allowed", async () => {
    mockCheckRateLimit.mockResolvedValue(blockedResult);
    const handler = vi.fn();

    const wrapped = withRateLimit(handler, options);
    const response = await wrapped(makeRequest());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Reset")).toBe("1712345678");
  });

  it("uses custom identifier function when provided", async () => {
    mockCheckRateLimit.mockResolvedValue(allowedResult);
    const handler = vi
      .fn()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const wrapped = withRateLimit(handler, {
      ...options,
      identifier: () => "user-42",
    });
    await wrapped(makeRequest({ "x-forwarded-for": "1.2.3.4" }));

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "ratelimit:ai:user-42",
      10,
      60
    );
  });

  it("extracts IP from x-forwarded-for header", async () => {
    mockCheckRateLimit.mockResolvedValue(allowedResult);
    const handler = vi
      .fn()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const wrapped = withRateLimit(handler, options);
    await wrapped(
      makeRequest({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" })
    );

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "ratelimit:ai:9.9.9.9",
      10,
      60
    );
  });

  it("adds headers to both allowed and 429 responses", async () => {
    mockCheckRateLimit.mockResolvedValueOnce(allowedResult);
    mockCheckRateLimit.mockResolvedValueOnce(blockedResult);
    const handler = vi
      .fn()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const wrapped = withRateLimit(handler, options);
    const okResponse = await wrapped(makeRequest());
    const blockedResponse = await wrapped(makeRequest());

    for (const response of [okResponse, blockedResponse]) {
      expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
      expect(response.headers.get("X-RateLimit-Reset")).toBe("1712345678");
    }
    expect(okResponse.headers.get("X-RateLimit-Remaining")).toBe("9");
    expect(blockedResponse.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blockedResponse.headers.get("Retry-After")).toBe("42");
  });

  it("falls back to x-real-ip and then to 'unknown'", async () => {
    expect(getClientIp(makeRequest({ "x-real-ip": "5.6.7.8" }))).toBe(
      "5.6.7.8"
    );
    expect(getClientIp(makeRequest())).toBe("unknown");
  });
});
