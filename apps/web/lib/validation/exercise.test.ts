import { describe, expect, it } from "vitest";
import { saveAnswersSchema } from "./exercise";

const validBody = {
  answers: [
    { sentenceId: "abc-123", userAnswer: "Я йду додому" },
    { sentenceId: "def-456", userAnswer: "..." },
    { sentenceId: "ghi-789", userAnswer: "не знаю" },
  ],
};

describe("saveAnswersSchema", () => {
  it("accepts a valid payload", () => {
    const result = saveAnswersSchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it("rejects an empty answers array", () => {
    const result = saveAnswersSchema.safeParse({ answers: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a missing answers field", () => {
    const result = saveAnswersSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an answer without sentenceId", () => {
    const result = saveAnswersSchema.safeParse({
      answers: [{ userAnswer: "text" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string userAnswer", () => {
    const result = saveAnswersSchema.safeParse({
      answers: [{ sentenceId: "abc-123", userAnswer: 42 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty userAnswer", () => {
    const result = saveAnswersSchema.safeParse({
      answers: [{ sentenceId: "abc-123", userAnswer: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only userAnswer", () => {
    const result = saveAnswersSchema.safeParse({
      answers: [{ sentenceId: "abc-123", userAnswer: "   " }],
    });
    expect(result.success).toBe(false);
  });
});
