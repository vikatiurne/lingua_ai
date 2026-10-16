import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIProviderError, AITimeoutError } from "../errors";
import { OpenRouterProvider } from "./openrouter";

const SUCCESS_BODY = {
  id: "gen-123",
  model: "meta-llama/llama-3.1-8b-instruct",
  choices: [
    { index: 0, message: { role: "assistant", content: '{"ok":true}' } },
  ],
  usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
};

const messages = [{ role: "user" as const, content: "Return JSON {ok: true}" }];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeFetchMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) {
  const mock = vi.fn(handler);
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function bodyOf(
  mock: ReturnType<typeof makeFetchMock>,
  callIndex = 0
): Record<string, unknown> {
  const init = mock.mock.calls[callIndex]?.[1];
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

describe("OpenRouterProvider", () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_DEFAULT_MODEL = "test-model";
    provider = new OpenRouterProvider();
  });

  it("returns an AICompletionResult on success", async () => {
    makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    const result = await provider.complete(messages);

    expect(result).toMatchObject({
      text: '{"ok":true}',
      provider: "openrouter",
      model: "meta-llama/llama-3.1-8b-instruct",
      usage: { promptTokens: 12, completionTokens: 5, totalTokens: 17 },
    });
    expect(typeof result.latencyMs).toBe("number");
  });

  it("sends the bearer token and default model in the request", async () => {
    const fetchMock = makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    await provider.complete(messages);

    const init = fetchMock.mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(bodyOf(fetchMock).model).toBe("test-model");
  });

  it("isConfigured() returns false when the env key is absent", () => {
    delete process.env.OPENROUTER_API_KEY;

    expect(new OpenRouterProvider().isConfigured()).toBe(false);
  });

  it("isConfigured() returns true when the env key is present", () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it("retries on 429 and succeeds on the second attempt", async () => {
    let calls = 0;
    const fetchMock = makeFetchMock(async () => {
      calls += 1;
      return calls === 1
        ? jsonResponse({ error: { message: "Rate limited" } }, 429)
        : jsonResponse(SUCCESS_BODY);
    });

    const result = await provider.complete(messages);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('{"ok":true}');
  });

  it("throws AIProviderError with statusCode 429 after all retries", async () => {
    const fetchMock = makeFetchMock(async () =>
      jsonResponse({ error: { message: "Rate limited" } }, 429)
    );

    await expect(provider.complete(messages)).rejects.toMatchObject({
      provider: "openrouter",
      statusCode: 429,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 400 and throws immediately", async () => {
    const fetchMock = makeFetchMock(async () =>
      jsonResponse({ error: { message: "Bad request" } }, 400)
    );

    await expect(provider.complete(messages)).rejects.toBeInstanceOf(
      AIProviderError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws AITimeoutError when the request times out", async () => {
    makeFetchMock(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    );

    await expect(
      provider.complete(messages, { timeoutMs: 50 })
    ).rejects.toBeInstanceOf(AITimeoutError);
  });

  it("adds response_format json_object when responseFormat is json", async () => {
    const fetchMock = makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    await provider.complete(messages, { responseFormat: "json" });

    expect(bodyOf(fetchMock).response_format).toEqual({ type: "json_object" });
  });

  it("throws AIProviderError on an empty content", async () => {
    makeFetchMock(async () =>
      jsonResponse({ choices: [{ message: { content: "" } }] })
    );

    await expect(provider.complete(messages)).rejects.toBeInstanceOf(
      AIProviderError
    );
  });

  it("wraps network failures in AIProviderError", async () => {
    makeFetchMock(async () => {
      throw new Error("network down");
    });

    await expect(provider.complete(messages)).rejects.toMatchObject({
      provider: "openrouter",
      message: "network down",
    });
  });
});
