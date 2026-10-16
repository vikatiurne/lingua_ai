import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIProviderError, AITimeoutError } from "../errors";
import { GeminiProvider } from "./gemini";

const SUCCESS_BODY = {
  candidates: [
    {
      content: {
        parts: [{ text: '{"ok":true}' }],
        role: "model",
      },
    },
  ],
  usageMetadata: {
    promptTokenCount: 12,
    candidatesTokenCount: 5,
    totalTokenCount: 17,
  },
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

describe("GeminiProvider", () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_DEFAULT_MODEL = "test-model";
    provider = new GeminiProvider();
  });

  it("returns an AICompletionResult on success", async () => {
    makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    const result = await provider.complete(messages);

    expect(result).toMatchObject({
      text: '{"ok":true}',
      provider: "gemini",
      model: "test-model",
      usage: { promptTokens: 12, completionTokens: 5, totalTokens: 17 },
    });
    expect(typeof result.latencyMs).toBe("number");
  });

  it("moves system messages to systemInstruction and assistant to model role", async () => {
    const fetchMock = makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    await provider.complete([
      { role: "system", content: "Be brief" },
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]);

    const body = bodyOf(fetchMock);
    expect(body.systemInstruction).toEqual({
      parts: [{ text: "Be brief" }],
    });
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "Hi" }] },
      { role: "model", parts: [{ text: "Hello" }] },
    ]);
    expect(body.contents).not.toContainEqual(
      expect.objectContaining({ role: "system" })
    );
  });

  it("omits systemInstruction when there is no system message", async () => {
    const fetchMock = makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    await provider.complete(messages);

    expect(bodyOf(fetchMock).systemInstruction).toBeUndefined();
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

  it("sets responseMimeType when responseFormat is json", async () => {
    const fetchMock = makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    await provider.complete(messages, { responseFormat: "json" });

    expect(bodyOf(fetchMock).generationConfig).toMatchObject({
      responseMimeType: "application/json",
    });
  });

  it("throws AIProviderError on an empty candidates array", async () => {
    makeFetchMock(async () => jsonResponse({ candidates: [] }));

    await expect(provider.complete(messages)).rejects.toBeInstanceOf(
      AIProviderError
    );
  });

  it("sends the API key in the URL and the default model", async () => {
    const fetchMock = makeFetchMock(async () => jsonResponse(SUCCESS_BODY));

    await provider.complete(messages);

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("models/test-model:generateContent?key=test-key");
  });
});
