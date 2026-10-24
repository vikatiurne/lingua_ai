import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdaptiveState } from "./adaptive";
import {
  clearTestState,
  deserializeTestState,
  loadTestState,
  saveTestState,
  serializeTestState,
} from "./storage";

function createState(): AdaptiveState {
  return {
    currentLevelIndex: 2,
    currentSet: 2,
    visitedLevels: new Set([1, 2]),
    currentQuestionId: "a2_plus_1",
    correctCountInLevel: 2,
    askedInLevel: 3,
    totalAsked: 8,
    totalCorrect: 6,
    askedQuestionIds: new Set(["q1", "q2", "q3"]),
    history: [
      { questionId: "q1", correct: true, skipped: false },
      { questionId: "q2", correct: false, skipped: true },
    ],
    finished: false,
    resultLevel: null,
  };
}

function createStorage() {
  const data = new Map<string, string>();

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("test state storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips adaptive state through serialization", () => {
    const state = createState();
    const restored = deserializeTestState(JSON.stringify(serializeTestState(state)));

    expect(restored).toEqual(state);
  });

  it("rejects malformed JSON", () => {
    expect(deserializeTestState("{not-json")).toBeNull();
  });

  it("rejects an incompatible storage version", () => {
    const payload = { ...serializeTestState(createState()), version: 999 };

    expect(deserializeTestState(JSON.stringify(payload))).toBeNull();
  });

  it("saves, loads and clears state from localStorage", () => {
    const state = createState();

    saveTestState(state);
    expect(loadTestState()).toEqual(state);

    clearTestState();
    expect(loadTestState()).toBeNull();
  });
});
