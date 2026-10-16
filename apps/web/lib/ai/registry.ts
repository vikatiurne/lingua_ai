import { DeepSeekProvider } from "./providers/deepseek";
import { GeminiProvider } from "./providers/gemini";
import { OpenRouterProvider } from "./providers/openrouter";
import type { AIProvider } from "./provider";

export const DEFAULT_PROVIDERS: AIProvider[] = [
  new OpenRouterProvider(),
  new GeminiProvider(),
  new DeepSeekProvider(),
];
