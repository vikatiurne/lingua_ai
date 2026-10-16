import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CEFRLevel } from "@lingua/shared";
import { CEFR_LEVEL } from "@lingua/shared";
import { clearSlotCache } from "./loader";
import { resolveTemplateFile } from "./ref-resolver";
import {
  getTopicsForLevel,
  getSubtopicsForTopic,
  getPatternsForSubtopic,
  getPatternById,
  getAllPatternIdsForLevel,
  clearTemplateServiceCache,
} from "./template-service";

vi.mock("./ref-resolver", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ref-resolver")>();
  return {
    ...actual,
    resolveTemplateFile: vi.fn(actual.resolveTemplateFile),
  };
});

const ALL_LEVELS: CEFRLevel[] = [
  CEFR_LEVEL.A1,
  CEFR_LEVEL.A2,
  CEFR_LEVEL.A2_PLUS,
  CEFR_LEVEL.B1,
  CEFR_LEVEL.B1_PLUS,
  CEFR_LEVEL.B2,
  CEFR_LEVEL.C1,
  CEFR_LEVEL.C2,
];

describe("template-service", () => {
  beforeEach(() => {
    clearSlotCache();
    clearTemplateServiceCache();
    vi.mocked(resolveTemplateFile).mockClear();
  });

  it("getTopicsForLevel returns non-empty array (A1)", async () => {
    const topics = await getTopicsForLevel(CEFR_LEVEL.A1);
    expect(Array.isArray(topics)).toBe(true);
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.every((t) => typeof t === "string")).toBe(true);
  });

  it("getSubtopicsForTopic includes Present Simple (B1)", async () => {
    const subtopics = await getSubtopicsForTopic(
      CEFR_LEVEL.B1,
      "Present Tenses"
    );
    expect(subtopics).toContain("Present Simple");
  });

  it("getSubtopicsForTopic returns [] for unknown topic", async () => {
    const subtopics = await getSubtopicsForTopic(CEFR_LEVEL.B1, "Unknown");
    expect(subtopics).toEqual([]);
  });

  it("getPatternsForSubtopic returns patterns (B1 Present Simple)", async () => {
    const patterns = await getPatternsForSubtopic(
      CEFR_LEVEL.B1,
      "Present Tenses",
      "Present Simple"
    );
    expect(patterns.length).toBeGreaterThan(0);
  });

  it("getPatternsForSubtopic returns [] for unknown subtopic", async () => {
    const patterns = await getPatternsForSubtopic(
      CEFR_LEVEL.B1,
      "Present Tenses",
      "Unknown"
    );
    expect(patterns).toEqual([]);
  });

  it("getPatternById finds ps_01 (B1)", async () => {
    const pattern = await getPatternById(CEFR_LEVEL.B1, "ps_01");
    expect(pattern).not.toBeNull();
    expect(pattern?.id).toBe("ps_01");
  });

  it("getPatternById returns null for unknown id", async () => {
    const pattern = await getPatternById(CEFR_LEVEL.B1, "zzz");
    expect(pattern).toBeNull();
  });

  it("getAllPatternIdsForLevel returns non-empty string array (C1)", async () => {
    const ids = await getAllPatternIdsForLevel(CEFR_LEVEL.C1);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => typeof id === "string")).toBe(true);
  });

  it("getTopicsForLevel returns >= 1 topic for all 8 levels", async () => {
    for (const level of ALL_LEVELS) {
      const topics = await getTopicsForLevel(level);
      expect(topics.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("caches resolved file: second call does not re-resolve", async () => {
    await getTopicsForLevel(CEFR_LEVEL.A1);
    await getTopicsForLevel(CEFR_LEVEL.A1);
    expect(resolveTemplateFile).toHaveBeenCalledTimes(1);
  });

  it("clearTemplateServiceCache forces re-resolve", async () => {
    await getTopicsForLevel(CEFR_LEVEL.A1);
    clearTemplateServiceCache();
    const second = await getTopicsForLevel(CEFR_LEVEL.A1);
    expect(resolveTemplateFile).toHaveBeenCalledTimes(2);
    expect(second.length).toBeGreaterThan(0);
  });
});
