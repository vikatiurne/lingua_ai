import type { CEFRLevel } from "../enums/cefr-level";
import type { ExerciseStatus } from "../enums/exercise-status";

export type SentenceDirection = "uk-en" | "en-uk";

export type ExerciseSentence = {
  id: string;
  source: string;
  direction: SentenceDirection;
  reference: string;
  userAnswer?: string;
  isCorrect?: boolean;
  errorId?: string;
};

export type Exercise = {
  id: string;
  userId: string;
  level: CEFRLevel;
  topic: string;
  subtopic?: string;
  templateIds: string[];
  sentences: ExerciseSentence[];
  topicScore?: number;
  grammarScore?: number;
  status: ExerciseStatus;
  createdAt: string;
  completedAt?: string;
};
