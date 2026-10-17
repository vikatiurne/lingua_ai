import { CEFR_LEVEL, type CEFRLevel } from "@lingua/shared";
import type { TestQuestion, TestSet } from "./loader";

export type AdaptiveState = {
  currentLevelIndex: number;
  currentSet: TestSet;
  visitedLevels: Set<number>;
  currentQuestionId: string | null;
  correctCountInLevel: number;
  askedInLevel: number;
  totalAsked: number;
  totalCorrect: number;
  askedQuestionIds: Set<string>;
  history: { questionId: string; correct: boolean; skipped: boolean }[];
  finished: boolean;
  resultLevel: CEFRLevel | null;
};

const CEFR_LEVELS: CEFRLevel[] = [
  CEFR_LEVEL.A1,
  CEFR_LEVEL.A2,
  CEFR_LEVEL.A2_PLUS,
  CEFR_LEVEL.B1,
  CEFR_LEVEL.B1_PLUS,
  CEFR_LEVEL.B2,
  CEFR_LEVEL.C1,
  CEFR_LEVEL.C2,
];

const QUESTIONS_PER_LEVEL = 5;
const START_LEVEL_INDEX = 1; // A2

export function startTest(questions: TestQuestion[]): AdaptiveState {
  return {
    currentLevelIndex: START_LEVEL_INDEX,
    currentSet: 1,
    visitedLevels: new Set<number>([START_LEVEL_INDEX]),
    currentQuestionId: null,
    correctCountInLevel: 0,
    askedInLevel: 0,
    totalAsked: 0,
    totalCorrect: 0,
    askedQuestionIds: new Set<string>(),
    history: [],
    finished: false,
    resultLevel: null,
  };
}

function getCurrentLevel(state: AdaptiveState): CEFRLevel {
  const idx = Math.max(0, Math.min(CEFR_LEVELS.length - 1, state.currentLevelIndex));
  return CEFR_LEVELS[idx] as CEFRLevel;
}

function clampLevelIndex(idx: number): number {
  return Math.max(0, Math.min(CEFR_LEVELS.length - 1, idx));
}

function getPool(
  state: AdaptiveState,
  questions: TestQuestion[],
  level: CEFRLevel,
  set: TestSet,
): TestQuestion[] {
  return questions.filter(
    (q) => q.level === level && q.set === set && !state.askedQuestionIds.has(q.id),
  );
}

function randomFrom(pool: TestQuestion[]): TestQuestion | null {
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? null;
}

/**
 * Selects the next question. May mutate `state` in two edge cases:
 * - set 1 pool exhausted -> switch to set 2
 * - set 2 pool exhausted -> mark the test as finished
 */
export function getNextQuestion(
  state: AdaptiveState,
  questions: TestQuestion[],
): TestQuestion | null {
  if (state.finished) {
    return null;
  }

  const level = getCurrentLevel(state);
  let pool = getPool(state, questions, level, state.currentSet);

  if (pool.length === 0 && state.currentSet === 1) {
    state.currentSet = 2;
    pool = getPool(state, questions, level, 2);
  }

  if (pool.length === 0) {
    state.finished = true;
    state.resultLevel = state.resultLevel ?? level;
    return null;
  }

  const question = randomFrom(pool);
  state.currentQuestionId = question?.id ?? null;
  return question;
}

function transitionToLevel(state: AdaptiveState, newLevelIndex: number): AdaptiveState {
  const visitedLevels = new Set(state.visitedLevels);
  let currentSet: TestSet;

  if (visitedLevels.has(newLevelIndex)) {
    currentSet = 2;
  } else {
    currentSet = 1;
    visitedLevels.add(newLevelIndex);
  }

  return {
    ...state,
    currentLevelIndex: newLevelIndex,
    currentSet,
    visitedLevels,
    askedInLevel: 0,
    correctCountInLevel: 0,
  };
}

export function submitAnswer(
  state: AdaptiveState,
  correct: boolean,
  skipped = false,
): AdaptiveState {
  if (state.finished) {
    return { ...state };
  }

  const totalAsked = state.totalAsked + 1;
  const newState: AdaptiveState = {
    ...state,
    askedInLevel: state.askedInLevel + 1,
    totalAsked,
    totalCorrect: state.totalCorrect + (correct ? 1 : 0),
    correctCountInLevel: state.correctCountInLevel + (correct ? 1 : 0),
    history: state.currentQuestionId
      ? [...state.history, { questionId: state.currentQuestionId, correct, skipped }]
      : state.history,
  };

  const shouldEvaluateLevel = newState.askedInLevel >= QUESTIONS_PER_LEVEL;
  if (!shouldEvaluateLevel) {
    return newState;
  }

  const correctInLevel = newState.correctCountInLevel;

  if (correctInLevel >= 4) {
    const newLevelIndex = newState.currentLevelIndex + 1;
    if (newLevelIndex > CEFR_LEVELS.length - 1) {
      return {
        ...newState,
        currentLevelIndex: clampLevelIndex(newLevelIndex),
        finished: true,
        resultLevel: CEFR_LEVELS[CEFR_LEVELS.length - 1] as CEFRLevel,
      };
    }
    return transitionToLevel(newState, newLevelIndex);
  }

  if (correctInLevel <= 2) {
    const newLevelIndex = newState.currentLevelIndex - 1;
    if (newLevelIndex < 0) {
      return {
        ...newState,
        currentLevelIndex: 0,
        finished: true,
        resultLevel: CEFR_LEVELS[0] as CEFRLevel,
      };
    }
    return transitionToLevel(newState, newLevelIndex);
  }

  return {
    ...newState,
    finished: true,
    resultLevel: CEFR_LEVELS[clampLevelIndex(newState.currentLevelIndex)] as CEFRLevel,
  };
}

export function isFinished(state: AdaptiveState): boolean {
  return state.finished;
}

export function getResult(state: AdaptiveState): {
  level: CEFRLevel;
  correctCount: number;
  totalCount: number;
} {
  const level =
    state.resultLevel ?? (CEFR_LEVELS[clampLevelIndex(state.currentLevelIndex)] as CEFRLevel);
  return {
    level,
    correctCount: state.totalCorrect,
    totalCount: state.totalAsked,
  };
}
