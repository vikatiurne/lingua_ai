export const VOCABULARY_STATUS = {
  LEARNING: "learning",
  LEARNED: "learned",
} as const;

export type VocabularyStatus =
  (typeof VOCABULARY_STATUS)[keyof typeof VOCABULARY_STATUS];

export const VOCABULARY_STATUS_VALUES = Object.values(
  VOCABULARY_STATUS
) as VocabularyStatus[];
