import { AIProviderError, AITimeoutError } from "../errors";
import type { AIProvider } from "../provider";
import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from "../types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const FALLBACK_MODEL = "gemini-1.5-flash";
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

function toGeminiContents(messages: AIMessage[]) {
  const systemMessages = messages.filter((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  const contents = otherMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const systemInstruction =
    systemMessages.length > 0
      ? { parts: systemMessages.map((m) => ({ text: m.content })) }
      : undefined;

  return { contents, systemInstruction };
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof AIProviderError && error.statusCode !== undefined) {
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return false;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retryable: (error: unknown) => boolean,
  maxAttempts = MAX_ATTEMPTS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!retryable(error) || attempt === maxAttempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }
  throw lastError;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    return data.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const model =
      options?.model ?? process.env.GEMINI_DEFAULT_MODEL ?? FALLBACK_MODEL;

    const { contents, systemInstruction } = toGeminiContents(messages);

    const generationConfig: Record<string, unknown> = {};
    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (options?.responseFormat === "json") {
      generationConfig.responseMimeType = "application/json";
    }

    const body: Record<string, unknown> = { contents, generationConfig };
    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const data = await withRetry(
      () => this.request(model, body, options),
      shouldRetry
    );

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) {
      throw new AIProviderError("gemini", "Empty response");
    }

    return {
      text,
      provider: this.name,
      model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      latencyMs: Date.now() - startTime,
    };
  }

  private async request(
    model: string,
    body: Record<string, unknown>,
    options?: AICompletionOptions
  ): Promise<GeminiResponse> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const apiKey = process.env.GEMINI_API_KEY ?? "";
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new AIProviderError("gemini", message, response.status);
      }

      return (await response.json()) as GeminiResponse;
    } catch (error) {
      if (isAbortError(error)) {
        throw new AITimeoutError("gemini", timeoutMs);
      }
      if (error instanceof AIProviderError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new AIProviderError("gemini", message);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
