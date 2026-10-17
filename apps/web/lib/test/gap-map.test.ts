import { describe, expect, it } from "vitest";
import { CEFR_LEVEL } from "@lingua/shared";
import type { TestQuestion } from "./loader";
import { analyzeGaps, type TestAnswer } from "./gap-map";

function makeQuestion(id: string, topic: string, level: TestQuestion["level"]): TestQuestion {
  return {
    id,
    level,
    set: 1,
    topic,
    question: `Q ${id}`,
    options: ["a", "b", "c", "d"],
    correctIndex: 0,
  };
}

function answer(questionId: string, correct: boolean, skipped = false): TestAnswer {
  return { questionId, correct, skipped };
}

const questions: TestQuestion[] = [
  makeQuestion("pp_1", "Present Perfect", CEFR_LEVEL.A2_PLUS),
  makeQuestion("pp_2", "Present Perfect", CEFR_LEVEL.A2_PLUS),
  makeQuestion("pp_3", "Present Perfect", CEFR_LEVEL.A2_PLUS),
  makeQuestion("sc_1", "Second Conditional", CEFR_LEVEL.B1),
  makeQuestion("mv_1", "Modal Verbs", CEFR_LEVEL.B1),
];

describe("analyzeGaps", () => {
  it("returns an empty array for empty answers", () => {
    expect(analyzeGaps([], questions)).toEqual([]);
  });

  it("returns a single weak topic for one wrong answer", () => {
    const result = analyzeGaps([answer("pp_1", false)], questions);
    expect(result).toEqual([
      { topic: "Present Perfect", level: CEFR_LEVEL.A2_PLUS, errors: 1, skippedCount: 0 },
    ]);
  });

  it("groups three wrong answers in the same topic", () => {
    const result = analyzeGaps(
      [answer("pp_1", false), answer("pp_2", false), answer("pp_3", false)],
      questions,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      topic: "Present Perfect",
      level: CEFR_LEVEL.A2_PLUS,
      errors: 3,
      skippedCount: 0,
    });
  });

  it("sorts weak topics by errors descending", () => {
    const result = analyzeGaps(
      [
        answer("pp_1", false),
        answer("sc_1", false),
        answer("pp_2", false),
        answer("mv_1", false),
        answer("pp_3", false),
      ],
      questions,
    );
    expect(result.map((gap) => gap.topic)).toEqual([
      "Present Perfect",
      "Second Conditional",
      "Modal Verbs",
    ]);
    expect(result.map((gap) => gap.errors)).toEqual([3, 1, 1]);
  });

  it("counts skipped answers while keeping them as errors", () => {
    const result = analyzeGaps([answer("pp_1", false, true), answer("pp_2", false)], questions);
    expect(result).toEqual([
      { topic: "Present Perfect", level: CEFR_LEVEL.A2_PLUS, errors: 2, skippedCount: 1 },
    ]);
  });

  it("returns an empty array when all answers are correct", () => {
    const result = analyzeGaps(
      [answer("pp_1", true), answer("sc_1", true), answer("mv_1", true)],
      questions,
    );
    expect(result).toEqual([]);
  });
});
