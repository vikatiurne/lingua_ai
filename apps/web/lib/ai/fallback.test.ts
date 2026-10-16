import { beforeEach, describe, expect, it } from "vitest";
import { AIProviderError, AIServiceError } from "./errors";
import type { AIProvider } from "./provider";
import type { ProviderName } from "./types";
import { completeWithFallback, registerProviders } from "./fallback";

function makeMockProvider(
  name: ProviderName,
  behavior: "success" | "fail" | "not_configured",
  delayMs = 0
): AIProvider {
  return {
    name,
    isConfigured: () => behavior !== "not_configured",
    complete: async () => {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      if (behavior === "fail")
        throw new AIProviderError(name, "mock fail", 500);
      return {
        text: `${name}-response`,
        provider: name,
        model: `${name}-model`,
        latencyMs: delayMs,
      };
    },
  };
}

const messages = [{ role: "user" as const, content: "translate this" }];

describe("completeWithFallback", () => {
  beforeEach(() => {
    registerProviders([]);
  });

  it("returns the result of a single working provider", async () => {
    registerProviders([makeMockProvider("openrouter", "success")]);

    const result = await completeWithFallback(messages);

    expect(result.text).toBe("openrouter-response");
    expect(result.provider).toBe("openrouter");
  });

  it("falls back to the second provider when the first fails", async () => {
    registerProviders([
      makeMockProvider("openrouter", "fail"),
      makeMockProvider("gemini", "success"),
    ]);

    const result = await completeWithFallback(messages);

    expect(result.provider).toBe("gemini");
  });

  it("throws AIServiceError with all attempts when every provider fails", async () => {
    registerProviders([
      makeMockProvider("openrouter", "fail"),
      makeMockProvider("gemini", "fail"),
    ]);

    await expect(completeWithFallback(messages)).rejects.toThrow(AIServiceError);

    try {
      await completeWithFallback(messages);
    } catch (error) {
      expect(error).toBeInstanceOf(AIServiceError);
      const attempts = (error as AIServiceError).attempts;
      expect(attempts).toHaveLength(2);
      expect(attempts[0]?.provider).toBe("openrouter");
    }
  });

  it("throws AIServiceError when the registry is empty", async () => {
    await expect(completeWithFallback(messages)).rejects.toThrow(AIServiceError);
  });

  it("skips providers where isConfigured() is false", async () => {
    registerProviders([
      makeMockProvider("openrouter", "not_configured"),
      makeMockProvider("gemini", "success"),
    ]);

    const result = await completeWithFallback(messages);

    expect(result.provider).toBe("gemini");
  });

  it("returns a result containing text, provider, model and latencyMs", async () => {
    registerProviders([makeMockProvider("deepseek", "success", 5)]);

    const result = await completeWithFallback(messages);

    expect(result).toMatchObject({
      text: "deepseek-response",
      provider: "deepseek",
      model: "deepseek-model",
    });
    expect(typeof result.latencyMs).toBe("number");
  });

  it("throws AIServiceError when the only provider is not configured", async () => {
    registerProviders([makeMockProvider("openrouter", "not_configured")]);

    await expect(completeWithFallback(messages)).rejects.toThrow(AIServiceError);
  });
});
