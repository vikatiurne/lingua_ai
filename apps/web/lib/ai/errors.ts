export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly attempts: { provider: string; error: string }[]
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AITimeoutError extends Error {
  constructor(public readonly provider: string, timeoutMs: number) {
    super(`Provider ${provider} timed out after ${timeoutMs}ms`);
    this.name = "AITimeoutError";
  }
}
