export const ERROR_TYPE = {
  TOPIC: "topic",
  GENERAL: "general",
} as const;

export type ErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE];

export const ERROR_TYPE_VALUES = Object.values(ERROR_TYPE) as ErrorType[];

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  topic: "Помилка за темою",
  general: "Загальна граматична помилка",
};

// Fine-grained error category stored in UserError.category.
// `type` (topic/general) drives routing; `category` drives the Dictionary (task 37).
export const ERROR_CATEGORY = {
  TOPIC: "topic",
  GRAMMAR: "grammar",
  SPELLING: "spelling",
  VOCABULARY: "vocabulary",
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORY)[keyof typeof ERROR_CATEGORY];

export const ERROR_CATEGORY_VALUES = Object.values(ERROR_CATEGORY) as ErrorCategory[];

export const ERROR_CATEGORY_LABELS: Record<ErrorCategory, string> = {
  topic: "Помилка за темою",
  grammar: "Граматика",
  spelling: "Правопис",
  vocabulary: "Словник",
};

// Sentence-level error types returned by the evaluation AI.
export const SENTENCE_ERROR_TYPE = {
  TOPIC: "topic",
  SPELLING: "spelling",
  VOCABULARY: "vocabulary",
  GRAMMAR: "grammar",
  SKIPPED: "skipped",
  NONE: "none",
} as const;

export type SentenceErrorType =
  (typeof SENTENCE_ERROR_TYPE)[keyof typeof SENTENCE_ERROR_TYPE];

export const SENTENCE_ERROR_TYPE_VALUES = Object.values(SENTENCE_ERROR_TYPE) as [
  SentenceErrorType,
  ...SentenceErrorType[],
];
