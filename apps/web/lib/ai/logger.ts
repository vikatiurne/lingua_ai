export type AILogEntry = {
  provider: string;
  model?: string;
  promptLength: number;
  responseLength: number;
  latencyMs: number;
  error?: string;
};

export function logAIRequest(entry: AILogEntry): void {
  try {
    console.log(
      JSON.stringify({
        scope: "ai",
        timestamp: new Date().toISOString(),
        ...entry,
      })
    );
  } catch {
    // Logging is not critical and must never break the request flow.
  }
}
