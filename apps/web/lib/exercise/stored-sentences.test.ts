import { describe, expect, it } from "vitest";
import {
  hasUnansweredSentences,
  parseStoredSentences,
  type StoredSentence,
} from "./stored-sentences";

const sentence: StoredSentence = {
  id: "s1",
  source: "Had I known, I would have stayed.",
  direction: "en_uk",
  reference: "[Еталон недоступний в аварійному режимі]",
  userAnswer: "Якби я знав, я б залишився.",
};

describe("parseStoredSentences", () => {
  it("accepts a valid fallback sentence with an id and reference", () => {
    expect(parseStoredSentences([sentence])).toEqual([sentence]);
  });

  it("rejects a missing id", () => {
    expect(
      parseStoredSentences([{ ...sentence, id: undefined }])
    ).toBeNull();
  });

  it("rejects a missing reference", () => {
    expect(
      parseStoredSentences([{ ...sentence, reference: undefined }])
    ).toBeNull();
  });

  it("rejects duplicate ids", () => {
    expect(parseStoredSentences([sentence, { ...sentence }])).toBeNull();
  });

  it("rejects an empty array", () => {
    expect(parseStoredSentences([])).toBeNull();
  });
});

describe("hasUnansweredSentences", () => {
  it("detects an empty or missing answer", () => {
    expect(
      hasUnansweredSentences([{ ...sentence, userAnswer: "" }])
    ).toBe(true);
    expect(
      hasUnansweredSentences([{ ...sentence, userAnswer: undefined }])
    ).toBe(true);
    expect(
      hasUnansweredSentences([{ ...sentence, userAnswer: "   " }])
    ).toBe(true);
  });

  it("accepts a real answer or a skip marker", () => {
    expect(hasUnansweredSentences([sentence])).toBe(false);
    expect(
      hasUnansweredSentences([{ ...sentence, userAnswer: "..." }])
    ).toBe(false);
  });
});
