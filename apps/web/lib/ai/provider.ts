import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  ProviderName,
} from "./types";

export interface AIProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult>;
}
