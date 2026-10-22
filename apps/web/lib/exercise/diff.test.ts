import { describe, expect, it } from "vitest";
import { diffAnswer, tokenize } from "./diff";

describe("tokenize", () => {
  it("lowercases and splits punctuation, keeping apostrophes", () => {
    expect(tokenize("It's a test, isn't it?")).toEqual([
      "it's",
      "a",
      "test",
      "isn't",
      "it",
    ]);
  });

  it("keeps Ukrainian letters", () => {
    expect(tokenize("Це — гарна ідея!")).toEqual(["це", "гарна", "ідея"]);
  });
});

describe("diffAnswer", () => {
  const reference = "This option is more comfortable than the previous one.";

  it("reports no differences for the exact reference", () => {
    const diff = diffAnswer(reference, reference);
    expect(diff.missing).toEqual([]);
    expect(diff.extra).toEqual([]);
    expect(diff.typoPairs).toEqual([]);
    expect(diff.onlyOrderChanged).toBe(false);
  });

  it("ignores punctuation, case and spacing", () => {
    const diff = diffAnswer(
      reference,
      "  this option IS more comfortable, than the previous one! "
    );
    expect(diff.missing).toEqual([]);
    expect(diff.extra).toEqual([]);
  });

  it("finds a single missing word", () => {
    const diff = diffAnswer(
      reference,
      "This option is more than the previous one."
    );
    expect(diff.missing).toEqual(["comfortable"]);
    expect(diff.missingPhrases).toEqual(["comfortable"]);
  });

  it("groups consecutive missing words into a phrase", () => {
    const diff = diffAnswer(
      "I usually wake up in the morning.",
      "I usually wake up."
    );
    expect(diff.missing).toEqual(["in", "the", "morning"]);
    expect(diff.missingPhrases).toEqual(["in the morning"]);
  });

  it("finds an extra word", () => {
    const diff = diffAnswer(
      "I like tea.",
      "I really like tea."
    );
    expect(diff.extra).toEqual(["really"]);
    expect(diff.missing).toEqual([]);
  });

  it("classifies a near-miss as a typo, not a missing word", () => {
    const diff = diffAnswer(
      reference,
      "This option is more comfortabl than the previous one."
    );
    expect(diff.typoPairs).toEqual([
      { wrong: "comfortabl", correct: "comfortable" },
    ]);
    expect(diff.missing).toEqual([]);
    expect(diff.extra).toEqual([]);
  });

  it("treats a different word as a substitution", () => {
    const diff = diffAnswer(
      "He went home.",
      "He returned home."
    );
    expect(diff.missing).toEqual(["went"]);
    expect(diff.extra).toEqual(["returned"]);
    expect(diff.substitutions).toEqual([
      { expected: "went", actual: "returned" },
    ]);
    expect(diff.typoPairs).toEqual([]);
  });

  it("does not pair words positionally when the answer has an explicit gap", () => {
    const diff = diffAnswer(
      "This option is less convenient than the previous one.",
      "this ... few comfortable than ..."
    );
    expect(diff.substitutions).toEqual([]);
    expect(diff.typoPairs).toEqual([]);
    expect(diff.missing).toContain("less");
    expect(diff.missing).toContain("option");
    expect(diff.extra).toEqual(["few", "comfortable"]);
  });

  it("detects a pure word-order change", () => {
    const diff = diffAnswer(
      "She always drinks coffee.",
      "Always she drinks coffee."
    );
    expect(diff.onlyOrderChanged).toBe(true);
  });

  it("does not flag the reference as a word-order change", () => {
    expect(diffAnswer(reference, reference).onlyOrderChanged).toBe(false);
  });

  it("handles an empty answer", () => {
    const diff = diffAnswer("I like tea.", "");
    expect(diff.missingPhrases).toEqual(["i like tea"]);
  });
});
