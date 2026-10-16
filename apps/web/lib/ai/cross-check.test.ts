import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerProviders } from "./fallback";
import { crossCheck } from "./cross-check";
import type { AIProvider } from "./provider";
import type { ProviderName } from "./types";

type MockProviderOptions = {
  configured?: boolean;
  text?: string;
  fail?: boolean;
};

function makeProvider(
  name: ProviderName,
  options: MockProviderOptions = {}
): AIProvider {
  return {
    name,
    isConfigured: () => options.configured ?? true,
    complete: async () => {
      if (options.fail) {
        throw new Error(`${name} down`);
      }
      return {
        text: options.text ?? "",
        provider: name,
        model: `${name}-model`,
        latencyMs: 1,
      };
    },
  };
}

const messages = [{ role: "user" as const, content: "Hi" }];

describe("crossCheck", () => {
  beforeEach(() => {
    registerProviders([]);
    vi.restoreAllMocks();
  });

  it("returns consistent when both providers return the same text", async () => {
    registerProviders([
      makeProvider("openrouter", { text: "Hello" }),
      makeProvider("gemini", { text: "  hello " }),
    ]);

    const result = await crossCheck(messages);

    expect(result.status).toBe("consistent");
    expect(result.normalizedTexts).toEqual(["hello", "hello"]);
    expect(result.primary?.provider).toBe("openrouter");
    expect(result.secondary?.provider).toBe("gemini");
  });

  it("returns divergent with 'Text differs' when texts differ", async () => {
    registerProviders([
      makeProvider("openrouter", { text: "cats" }),
      makeProvider("gemini", { text: "dogs" }),
    ]);

    const result = await crossCheck(messages);

    expect(result.status).toBe("divergent");
    expect(result.divergenceReason).toBe("Text differs");
    expect(result.primary?.text).toBe("cats");
    expect(result.secondary?.text).toBe("dogs");
  });

  it("returns divergent with 'One provider failed' when one provider fails", async () => {
    registerProviders([
      makeProvider("openrouter", { fail: true }),
      makeProvider("gemini", { text: "alive" }),
    ]);

    const result = await crossCheck(messages);

    expect(result.status).toBe("divergent");
    expect(result.divergenceReason).toBe("One provider failed");
    expect(result.primary).toBeUndefined();
    expect(result.secondary?.text).toBe("alive");
  });

  it("returns both_failed when both providers fail", async () => {
    registerProviders([
      makeProvider("openrouter", { fail: true }),
      makeProvider("gemini", { fail: true }),
    ]);

    const result = await crossCheck(messages);

    expect(result.status).toBe("both_failed");
    expect(result.primary).toBeUndefined();
    expect(result.secondary).toBeUndefined();
  });

  it("returns both_failed when fewer than 2 providers are configured", async () => {
    registerProviders([
      makeProvider("openrouter"),
      makeProvider("gemini", { configured: false }),
    ]);

    const result = await crossCheck(messages);

    expect(result.status).toBe("both_failed");
    expect(result.divergenceReason).toBe("Not enough providers configured");
  });

  it("treats JSON with different key casing and order as consistent", async () => {
    registerProviders([
      makeProvider("openrouter", { text: '{"Answer":"ok"}' }),
      makeProvider("gemini", { text: '{"answer":"ok"}' }),
    ]);

    const first = await crossCheck(messages);
    expect(first.status).toBe("consistent");

    registerProviders([
      makeProvider("openrouter", { text: '{"a":1,"b":2}' }),
      makeProvider("gemini", { text: '{"b":2,"a":1}' }),
    ]);

    const second = await crossCheck(messages);
    expect(second.status).toBe("consistent");
  });

  it("treats JSON with different values as divergent", async () => {
    registerProviders([
      makeProvider("openrouter", { text: '{"a":1}' }),
      makeProvider("gemini", { text: '{"a":2}' }),
    ]);

    const result = await crossCheck(messages);

    expect(result.status).toBe("divergent");
    expect(result.divergenceReason).toBe("Text differs");
  });

  it("never performs real HTTP requests", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    registerProviders([
      makeProvider("openrouter", { text: "same" }),
      makeProvider("gemini", { text: "same" }),
    ]);

    await crossCheck(messages);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never throws, even when a provider misbehaves", async () => {
    registerProviders([
      {
        name: "openrouter",
        isConfigured: () => {
          throw new Error("registry broken");
        },
        complete: async () => {
          throw new Error("unused");
        },
      },
      makeProvider("gemini", { text: "x" }),
    ]);

    const result = await crossCheck(messages);

    expect(result.status).toBe("both_failed");
    expect(result.divergenceReason).toBe("registry broken");
  });
});
