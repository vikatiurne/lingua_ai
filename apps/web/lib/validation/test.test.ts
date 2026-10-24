import { describe, expect, it } from "vitest";
import { testSubmissionSchema } from "./test";

const validAnswers = Array.from({ length: 5 }, (_, i) => ({
  questionId: `a2_0${i}`,
  correct: i % 2 === 0,
}));

const validBody = {
  level: "B1",
  answers: validAnswers,
  correctCount: 3,
  totalCount: 5,
};

describe("testSubmissionSchema", () => {
  it("accepts a valid submission", () => {
    const result = testSubmissionSchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown level", () => {
    const result = testSubmissionSchema.safeParse({ ...validBody, level: "Z9" });
    expect(result.success).toBe(false);
  });

  it("rejects empty answers", () => {
    const result = testSubmissionSchema.safeParse({ ...validBody, answers: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a 35-question adaptive test", () => {
    const answers = Array.from({ length: 35 }, (_, i) => ({
      questionId: `q_${i}`,
      correct: true,
    }));
    const result = testSubmissionSchema.safeParse({
      ...validBody,
      answers,
      correctCount: 35,
      totalCount: 35,
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 80 answers", () => {
    const answers = Array.from({ length: 81 }, (_, i) => ({
      questionId: `q_${i}`,
      correct: true,
    }));
    const result = testSubmissionSchema.safeParse({ ...validBody, answers });
    expect(result.success).toBe(false);
  });

  it("rejects totalCount below the minimum", () => {
    const result = testSubmissionSchema.safeParse({ ...validBody, totalCount: 4 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer correctCount", () => {
    const result = testSubmissionSchema.safeParse({ ...validBody, correctCount: 1.5 });
    expect(result.success).toBe(false);
  });
});
