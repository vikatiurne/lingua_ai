import { AIServiceError } from "./errors";
import type { AIProvider } from "./provider";
import { DEFAULT_PROVIDERS } from "./registry";
import { logAIRequest } from "./logger";
import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from "./types";

let providers: AIProvider[] = DEFAULT_PROVIDERS;

export function registerProviders(next: AIProvider[]): void {
  providers = next;
}

export async function completeWithFallback(
  messages: AIMessage[],
  options?: AICompletionOptions
): Promise<AICompletionResult> {
  const configured = providers.filter((provider) => provider.isConfigured());

  if (configured.length === 0) {
    throw new AIServiceError("No providers configured", []);
  }

  const promptLength = messages.reduce(
    (total, message) => total + message.content.length,
    0
  );
  const attempts: { provider: string; error: string }[] = [];

  for (const provider of configured) {
    const startTime = Date.now();

    try {
      const result = await provider.complete(messages, options);
      logAIRequest({
        provider: result.provider,
        model: result.model,
        promptLength,
        responseLength: result.text.length,
        latencyMs: Date.now() - startTime,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logAIRequest({
        provider: provider.name,
        promptLength,
        responseLength: 0,
        latencyMs: Date.now() - startTime,
        error: message,
      });
      attempts.push({ provider: provider.name, error: message });
    }
  }

  throw new AIServiceError("All providers failed", attempts);
}
