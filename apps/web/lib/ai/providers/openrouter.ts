import { AIProviderError, AITimeoutError } from "../errors";
import type { AIProvider } from "../provider";
import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;

type OpenRouterResponse = {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

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

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter" as const;

  isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const model =
      options?.model ?? process.env.OPENROUTER_DEFAULT_MODEL ?? "";

    const body: Record<string, unknown> = {
      model,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }
    if (options?.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const data = await withRetry(
      () => this.request(body, options),
      shouldRetry
    );

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AIProviderError("openrouter", "Empty response");
    }

    return {
      text: content,
      provider: this.name,
      model: data.model ?? model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      latencyMs: Date.now() - startTime,
    };
  }

  private async request(
    body: Record<string, unknown>,
    options?: AICompletionOptions
  ): Promise<OpenRouterResponse> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
          "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3001",
          "X-Title": "Lingua AI",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new AIProviderError("openrouter", message, response.status);
      }

      return (await response.json()) as OpenRouterResponse;
    } catch (error) {
      if (isAbortError(error)) {
        throw new AITimeoutError("openrouter", timeoutMs);
      }
      if (error instanceof AIProviderError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new AIProviderError("openrouter", message);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
