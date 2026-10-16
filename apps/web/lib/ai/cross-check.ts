import { getRegisteredProviders } from "./fallback";
import type { AIProvider } from "./provider";
import type {
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  CrossCheckResult,
} from "./types";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source)
        .sort()
        .map((key) => [key, sortKeys(source[key])])
    );
  }
  return value;
}

function tryCompareAsJson(a: string, b: string): boolean | null {
  try {
    const ja = JSON.parse(a);
    const jb = JSON.parse(b);
    return JSON.stringify(sortKeys(ja)) === JSON.stringify(sortKeys(jb));
  } catch {
    return null;
  }
}

function toResult(
  settled: PromiseSettledResult<AICompletionResult>
): AICompletionResult | undefined {
  return settled.status === "fulfilled" ? settled.value : undefined;
}

export async function crossCheck(
  messages: AIMessage[],
  options?: AICompletionOptions
): Promise<CrossCheckResult> {
  try {
    const configured = getRegisteredProviders().filter((provider) =>
      provider.isConfigured()
    );

    const primaryProvider = configured[0];
    const secondaryProvider = configured[1];

    if (!primaryProvider || !secondaryProvider) {
      return {
        status: "both_failed",
        divergenceReason: "Not enough providers configured",
      };
    }

    const [first, second] = await Promise.allSettled([
      primaryProvider.complete(messages, options),
      secondaryProvider.complete(messages, options),
    ]);

    const primary = toResult(first);
    const secondary = toResult(second);

    if (!primary && !secondary) {
      return { status: "both_failed" };
    }

    if (!primary || !secondary) {
      return {
        status: "divergent",
        primary,
        secondary,
        divergenceReason: "One provider failed",
      };
    }

    const normalizedTexts: [string, string] = [
      normalize(primary.text),
      normalize(secondary.text),
    ];

    if (
      normalizedTexts[0] === normalizedTexts[1] ||
      tryCompareAsJson(normalizedTexts[0], normalizedTexts[1]) === true
    ) {
      return { status: "consistent", primary, secondary, normalizedTexts };
    }

    return {
      status: "divergent",
      primary,
      secondary,
      normalizedTexts,
      divergenceReason: "Text differs",
    };
  } catch (error) {
    return {
      status: "both_failed",
      divergenceReason: error instanceof Error ? error.message : String(error),
    };
  }
}
