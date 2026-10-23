import { describe, expect, it } from "vitest";
import {
  FALLBACK_REFERENCE,
  buildFallbackSentences,
  isFallbackReference,
} from "./fallback";

describe("buildFallbackSentences", () => {
  it("uses English examples as en_uk with an unavailable reference", () => {
    const sentences = buildFallbackSentences(["Only one example."], 3);

    expect(sentences).toHaveLength(1);
    expect(sentences[0]).toMatchObject({
      source: "Only one example.",
      direction: "en_uk",
      reference: FALLBACK_REFERENCE,
    });
    expect(sentences[0]!.id.trim().length).toBeGreaterThan(0);
  });

  it("gives every sentence a unique id", () => {
    const sentences = buildFallbackSentences(["One.", "Two.", "Three."], 3);
    const ids = new Set(sentences.map((sentence) => sentence.id));

    expect(ids.size).toBe(sentences.length);
  });

  it("returns at most the requested count when enough examples exist", () => {
    const sentences = buildFallbackSentences(["One.", "Two.", "Three."], 2);

    expect(sentences.map((sentence) => sentence.source)).toEqual([
      "One.",
      "Two.",
    ]);
  });

  it("does not invent duplicates when there are fewer examples than requested", () => {
    const sentences = buildFallbackSentences(["One.", "Two."], 5);

    expect(sentences.map((sentence) => sentence.source)).toEqual([
      "One.",
      "Two.",
    ]);
  });
});

describe("isFallbackReference", () => {
  it("recognizes the fallback placeholder", () => {
    expect(isFallbackReference(FALLBACK_REFERENCE)).toBe(true);
    expect(isFallbackReference(` ${FALLBACK_REFERENCE} `)).toBe(true);
  });

  it("does not treat real or empty references as fallback", () => {
    expect(isFallbackReference("I had been working there for years.")).toBe(
      false
    );
    expect(isFallbackReference("")).toBe(false);
    expect(isFallbackReference(undefined)).toBe(false);
  });
});
