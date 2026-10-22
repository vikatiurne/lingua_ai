import type { SentenceErrorType } from "../enums/error-type";

export type VocabularyToAdd = {
  word: string;
  translation: string;
};

export type EvaluatedSentence = {
  id: string;
  isCorrect: boolean;
  errorType: SentenceErrorType;
  explanation: string;
  vocabularyToAdd?: VocabularyToAdd[];
};
