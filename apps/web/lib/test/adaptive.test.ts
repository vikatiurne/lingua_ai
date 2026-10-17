import { describe, expect, it } from "vitest";
import { CEFR_LEVEL } from "@lingua/shared";
import type { TestQuestion } from "./loader";
import {
  getNextQuestion,
  getResult,
  isFinished,
  startTest,
  submitAnswer,
  type AdaptiveState,
} from "./adaptive";

const makeQuestions = (levels: Array<keyof typeof CEFR_LEVEL>): TestQuestion[] => {
  const questions: TestQuestion[] = [];
  levels.forEach((lvl, idx) => {
    for (const set of [1, 2] as const) {
      for (let i = 0; i < 5; i++) {
        questions.push({
          id: `${lvl}_${idx}_${set}_${i}`,
          level: CEFR_LEVEL[lvl],
          set,
          topic: "test",
          question: `Q${i}`,
          options: ["a", "b", "c", "d"],
          correctIndex: 0,
        });
      }
    }
  });
  return questions;
};

function answerBatch(
  state: AdaptiveState,
  questions: TestQuestion[],
  count: number,
  correct: boolean,
): AdaptiveState {
  let next = state;
  for (let i = 0; i < count; i++) {
    const question = getNextQuestion(next, questions);
    if (!question) {
      throw new Error("Expected a question to be available");
    }
    const answered: AdaptiveState = {
      ...next,
      askedQuestionIds: new Set(next.askedQuestionIds).add(question.id),
    };
    next = submitAnswer(answered, correct);
  }
  return next;
}

describe("adaptive test", () => {
  it("startTest sets A2 and set 1", () => {
    const questions = makeQuestions(["A1", "A2", "A2_PLUS"]);
    const state = startTest(questions);
    expect(state.currentLevelIndex).toBe(1); // A2
    expect(state.currentSet).toBe(1);
    expect(state.visitedLevels.has(1)).toBe(true);
  });

  it("5 correct answers on A2 move to A2+", () => {
    const questions = makeQuestions(["A2", "A2_PLUS"]);
    const state = answerBatch(startTest(questions), questions, 5, true);
    expect(state.finished).toBe(false);
    expect(state.currentLevelIndex).toBe(2); // A2_PLUS
    expect(state.currentSet).toBe(1);
    expect(state.askedInLevel).toBe(0);
    expect(state.correctCountInLevel).toBe(0);
  });

  it("5 incorrect answers on A2 move to A1", () => {
    const questions = makeQuestions(["A1", "A2"]);
    const state = answerBatch(startTest(questions), questions, 5, false);
    expect(state.finished).toBe(false);
    expect(state.currentLevelIndex).toBe(0); // A1
    expect(state.currentSet).toBe(1);
    expect(state.askedInLevel).toBe(0);
    expect(state.correctCountInLevel).toBe(0);
  });

  it("3 correct + 2 incorrect on A2 -> stabilize and finish", () => {
    const questions = makeQuestions(["A2"]);
    let state = startTest(questions);
    state = answerBatch(state, questions, 3, true);
    state = answerBatch(state, questions, 2, false);
    expect(isFinished(state)).toBe(true);
    expect(state.resultLevel).toBe(CEFR_LEVEL.A2);
    const result = getResult(state);
    expect(result.level).toBe(CEFR_LEVEL.A2);
    expect(result.correctCount).toBe(3);
    expect(result.totalCount).toBe(5);
  });

  it("keeps asking past 25 questions and reaches C2 without a cap", () => {
    const questions = makeQuestions([
      "A1",
      "A2",
      "A2_PLUS",
      "B1",
      "B1_PLUS",
      "B2",
      "C1",
      "C2",
    ]);
    const state = answerBatch(startTest(questions), questions, 35, true);
    expect(isFinished(state)).toBe(true);
    const result = getResult(state);
    expect(result.level).toBe(CEFR_LEVEL.C2);
    expect(result.totalCount).toBe(35);
  });

  it("getResult returns correct values", () => {
    const questions = makeQuestions(["A2", "A2_PLUS", "B1"]);
    let state = startTest(questions);
    state = answerBatch(state, questions, 5, true); // A2 -> A2+
    state = answerBatch(state, questions, 5, true); // A2+ -> B1
    state = answerBatch(state, questions, 3, true); // B1
    state = answerBatch(state, questions, 2, false); // stabilize B1
    const result = getResult(state);
    expect(result.level).toBe(CEFR_LEVEL.B1);
    expect(result.correctCount).toBe(13);
    expect(result.totalCount).toBe(15);
  });

  it("on returning to a visited level asks questions from set 2", () => {
    const questions = makeQuestions(["A2", "A2_PLUS"]);
    let state = startTest(questions);
    state = answerBatch(state, questions, 5, true); // A2 -> A2_PLUS
    state = answerBatch(state, questions, 5, false); // A2_PLUS -> A2 (return)

    expect(state.currentLevelIndex).toBe(1); // A2
    expect(state.currentSet).toBe(2);

    const next = getNextQuestion(state, questions);
    expect(next).not.toBeNull();
    expect(next?.set).toBe(2);
    expect(next?.level).toBe(CEFR_LEVEL.A2);
  });

  it("does not repeat the same question within a level", () => {
    const questions = makeQuestions(["A2"]);
    let state = startTest(questions);
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const question = getNextQuestion(state, questions);
      expect(question).not.toBeNull();
      if (!question) break;
      expect(seen.has(question.id)).toBe(false);
      seen.add(question.id);
      const answered: AdaptiveState = {
        ...state,
        askedQuestionIds: new Set(state.askedQuestionIds).add(question.id),
      };
      state = submitAnswer(answered, false);
    }
    expect(seen.size).toBe(5);
    expect(state.history).toHaveLength(5);
  });

  it("records skipped answers as incorrect with a skipped flag", () => {
    const questions = makeQuestions(["A2"]);
    const state = startTest(questions);
    const question = getNextQuestion(state, questions);
    if (!question) throw new Error("Expected a question");
    const answered: AdaptiveState = {
      ...state,
      askedQuestionIds: new Set(state.askedQuestionIds).add(question.id),
    };
    const next = submitAnswer(answered, false, true);
    expect(next.totalCorrect).toBe(0);
    expect(next.history).toEqual([
      { questionId: question.id, correct: false, skipped: true },
    ]);
  });

  it("finishes when set 2 is exhausted on a repeated level", () => {
    const questions = makeQuestions(["A2", "A2_PLUS"]);
    let state = startTest(questions);
    state = answerBatch(state, questions, 5, true); // A2 set1 -> A2+
    state = answerBatch(state, questions, 5, false); // A2+ set1 -> A2 (set2)
    state = answerBatch(state, questions, 5, true); // A2 set2 -> A2+ (set2)
    state = answerBatch(state, questions, 5, false); // A2+ set2 -> A2 (set2 empty)
    expect(getNextQuestion(state, questions)).toBeNull();
    expect(isFinished(state)).toBe(true);
    expect(state.resultLevel).toBe(CEFR_LEVEL.A2);
  });
});
