export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AICompletionOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: "text" | "json";
  signal?: AbortSignal;
  sentenceCount?: number;
};

export type AICompletionResult = {
  text: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
};

export type ProviderName = "openrouter" | "gemini" | "deepseek";

export type CrossCheckStatus = "consistent" | "divergent" | "both_failed";

export type CrossCheckResult = {
  status: CrossCheckStatus;
  primary?: AICompletionResult;
  secondary?: AICompletionResult;
  normalizedTexts?: [string, string];
  divergenceReason?: string;
};
