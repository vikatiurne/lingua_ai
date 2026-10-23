import { CEFR_LEVELS, type CEFRLevel } from "@lingua/shared";
import type { AdaptiveState } from "./adaptive";
import type { TestSet } from "./loader";

const STORAGE_KEY = "lingua:level-test:state";
const STORAGE_VERSION = 1;
const TEST_ID = "level-test";

type StoredAnswer = {
  questionId: string;
  correct: boolean;
  skipped: boolean;
};

type StoredTestState = {
  version: typeof STORAGE_VERSION;
  testId: typeof TEST_ID;
  currentLevelIndex: number;
  currentSet: TestSet;
  visitedLevels: number[];
  currentQuestionId: string | null;
  correctCountInLevel: number;
  askedInLevel: number;
  totalAsked: number;
  totalCorrect: number;
  askedQuestionIds: string[];
  history: StoredAnswer[];
  finished: boolean;
  resultLevel: CEFRLevel | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidLevelIndex(value: unknown): value is number {
  return isNonNegativeInteger(value) && value < CEFR_LEVELS.length;
}

function isCefrLevel(value: unknown): value is CEFRLevel {
  return typeof value === "string" && (CEFR_LEVELS as string[]).includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStoredAnswer(value: unknown): value is StoredAnswer {
  return (
    isRecord(value) &&
    typeof value.questionId === "string" &&
    typeof value.correct === "boolean" &&
    typeof value.skipped === "boolean"
  );
}

function parseStoredState(value: unknown): StoredTestState | null {
  if (!isRecord(value)) return null;
  if (value.version !== STORAGE_VERSION || value.testId !== TEST_ID) return null;
  if (!isValidLevelIndex(value.currentLevelIndex)) return null;
  if (value.currentSet !== 1 && value.currentSet !== 2) return null;
  if (!Array.isArray(value.visitedLevels) || !value.visitedLevels.every(isValidLevelIndex)) {
    return null;
  }
  if (value.currentQuestionId !== null && typeof value.currentQuestionId !== "string") {
    return null;
  }
  if (!isNonNegativeInteger(value.correctCountInLevel)) return null;
  if (!isNonNegativeInteger(value.askedInLevel)) return null;
  if (!isNonNegativeInteger(value.totalAsked)) return null;
  if (!isNonNegativeInteger(value.totalCorrect)) return null;
  if (!isStringArray(value.askedQuestionIds)) return null;
  if (!Array.isArray(value.history) || !value.history.every(isStoredAnswer)) return null;
  if (typeof value.finished !== "boolean") return null;
  if (value.resultLevel !== null && !isCefrLevel(value.resultLevel)) return null;

  return value as StoredTestState;
}

export function serializeTestState(state: AdaptiveState): StoredTestState {
  return {
    version: STORAGE_VERSION,
    testId: TEST_ID,
    currentLevelIndex: state.currentLevelIndex,
    currentSet: state.currentSet,
    visitedLevels: [...state.visitedLevels],
    currentQuestionId: state.currentQuestionId,
    correctCountInLevel: state.correctCountInLevel,
    askedInLevel: state.askedInLevel,
    totalAsked: state.totalAsked,
    totalCorrect: state.totalCorrect,
    askedQuestionIds: [...state.askedQuestionIds],
    history: state.history.map((answer) => ({ ...answer })),
    finished: state.finished,
    resultLevel: state.resultLevel,
  };
}

export function deserializeTestState(raw: string): AdaptiveState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const stored = parseStoredState(parsed);
  if (!stored) return null;

  return {
    currentLevelIndex: stored.currentLevelIndex,
    currentSet: stored.currentSet,
    visitedLevels: new Set(stored.visitedLevels),
    currentQuestionId: stored.currentQuestionId,
    correctCountInLevel: stored.correctCountInLevel,
    askedInLevel: stored.askedInLevel,
    totalAsked: stored.totalAsked,
    totalCorrect: stored.totalCorrect,
    askedQuestionIds: new Set(stored.askedQuestionIds),
    history: stored.history.map((answer) => ({ ...answer })),
    finished: stored.finished,
    resultLevel: stored.resultLevel,
  };
}

export function saveTestState(state: AdaptiveState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeTestState(state)));
  } catch {
    return;
  }
}

export function loadTestState(): AdaptiveState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const state = deserializeTestState(raw);
    if (!state) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    return state;
  } catch {
    return null;
  }
}

export function clearTestState(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
