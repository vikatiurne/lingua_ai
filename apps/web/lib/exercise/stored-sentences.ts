export type StoredSentence = {
  id: string;
  source: string;
  direction: "uk_en" | "en_uk";
  reference: string;
  acceptedVariants?: string[];
  userAnswer?: string;
  isCorrect?: boolean;
  errorType?: string;
  explanation?: string;
  vocabularyToAdd?: { word: string; translation: string }[];
};

export const INVALID_EXERCISE_MESSAGE =
  "Некоректні дані вправи. Спробуйте створити нову.";
export const UNANSWERED_EXERCISE_MESSAGE =
  "Не всі відповіді заповнені. Заповніть усі поля та спробуйте ще раз.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseStoredSentences(value: unknown): StoredSentence[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const sentences: StoredSentence[] = [];
  const ids = new Set<string>();

  for (const raw of value) {
    if (!isRecord(raw)) return null;

    const { id, source, direction, reference, acceptedVariants, userAnswer } =
      raw;
    if (typeof id !== "string" || id.trim().length === 0 || ids.has(id)) {
      return null;
    }
    if (typeof source !== "string" || source.trim().length === 0) {
      return null;
    }
    if (direction !== "uk_en" && direction !== "en_uk") return null;
    if (typeof reference !== "string") return null;
    if (
      acceptedVariants !== undefined &&
      (!Array.isArray(acceptedVariants) ||
        acceptedVariants.some((variant) => typeof variant !== "string"))
    ) {
      return null;
    }
    if (userAnswer !== undefined && typeof userAnswer !== "string") return null;

    ids.add(id);
    sentences.push(raw as StoredSentence);
  }

  return sentences;
}

export function hasUnansweredSentences(sentences: StoredSentence[]): boolean {
  return sentences.some((sentence) => !sentence.userAnswer?.trim());
}
