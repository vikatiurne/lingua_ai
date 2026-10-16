import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIProviderError, AITimeoutError } from "../errors";
import { DeepSeekProvider } from "./deepseek";

const SUCCESS_BODY = {
  model: "deepseek-chat",
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

describe("DeepSeekProvider", () => {
  let provider: DeepSeekProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.DEEPSEEK_API_KEY = "test-key";
    process.env.DEEPSEEK_DEFAULT_MODEL = "test-model";
    provider = new DeepSeekProvider();
  });

  it("returns an AICompletionResult on success", async () => {
    makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    const result = await provider.complete(messages);

    expect(result).toMatchObject({
      text: '{"ok":true}',
      provider: "deepseek",
      model: "deepseek-chat",
      usage: { promptTokens: 12, completionTokens: 5, totalTokens: 17 },
    });
    expect(typeof result.latencyMs).toBe("number");
  });

  it("posts an OpenAI-compatible body to the DeepSeek URL", async () => {
    const fetchMock = makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    await provider.complete([{ role: "user", content: "Hi" }]);

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.deepseek.com/chat/completions"
    );
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(bodyOf(fetchMock)).toMatchObject({
      model: "test-model",
      messages: [{ role: "user", content: "Hi" }],
    });
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

  it("retries on 500 and throws after all attempts", async () => {
    const fetchMock = makeFetchMock(async () =>
      jsonResponse({ error: { message: "Server error" } }, 500)
    );

    await expect(provider.complete(messages)).rejects.toMatchObject({
      provider: "deepseek",
      statusCode: 500,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
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

  it("isConfigured() returns false without the API key", () => {
    delete process.env.DEEPSEEK_API_KEY;

    expect(new DeepSeekProvider().isConfigured()).toBe(false);
  });

  it("throws AIProviderError on an empty content", async () => {
    makeFetchMock(async () =>
      jsonResponse({ choices: [{ message: { content: "" } }] })
    );

    await expect(provider.complete(messages)).rejects.toBeInstanceOf(
      AIProviderError
    );
  });
});
