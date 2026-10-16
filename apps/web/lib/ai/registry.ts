import { OpenRouterProvider } from "./providers/openrouter";
import type { AIProvider } from "./provider";

// Task 12 will append Gemini and DeepSeek implementations.
export const DEFAULT_PROVIDERS: AIProvider[] = [new OpenRouterProvider()];
