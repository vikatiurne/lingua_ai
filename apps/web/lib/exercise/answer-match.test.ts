import { describe, expect, it } from "vitest";
import {
  matchesAcceptedAnswer,
  normalizeAnswerText,
} from "./answer-match";

describe("normalizeAnswerText", () => {
  it("lowercases, strips punctuation and collapses spaces", () => {
    expect(normalizeAnswerText("  This option, is  LESS convenient!  ")).toBe(
      "this option is less convenient"
    );
  });

  it("keeps apostrophes", () => {
    expect(normalizeAnswerText("It's fine")).toBe("it's fine");
  });
});

describe("matchesAcceptedAnswer", () => {
  const accepted = [
    "This option is less convenient than the previous one.",
    "This option is less comfortable than the previous one.",
  ];

  it("matches the reference ignoring punctuation/case", () => {
    expect(
      matchesAcceptedAnswer(
        "this option is less convenient than the previous one",
        accepted
      )
    ).toBe(true);
  });

  it("matches an accepted variant", () => {
    expect(
      matchesAcceptedAnswer(
        "This option is less comfortable than the previous one!",
        accepted
      )
    ).toBe(true);
  });

  it("does not match a different wording", () => {
    expect(
      matchesAcceptedAnswer("this option is cheaper than the other", accepted)
    ).toBe(false);
  });

  it("does not match empty answers", () => {
    expect(matchesAcceptedAnswer("", accepted)).toBe(false);
    expect(matchesAcceptedAnswer("...", accepted)).toBe(false);
    expect(matchesAcceptedAnswer(undefined, accepted)).toBe(false);
  });
});
