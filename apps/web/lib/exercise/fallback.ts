export const FALLBACK_REFERENCE =
  "[Еталон недоступний в аварійному режимі]";

export type FallbackSentence = {
  id: string;
  source: string;
  direction: "en_uk";
  reference: string;
};

export function buildFallbackSentences(
  examples: string[],
  count: number
): FallbackSentence[] {
  return examples.slice(0, count).map((source) => ({
    id: crypto.randomUUID(),
    source,
    direction: "en_uk",
    reference: FALLBACK_REFERENCE,
  }));
}

export function isFallbackReference(reference: string | undefined): boolean {
  return (reference ?? "").trim() === FALLBACK_REFERENCE;
}
