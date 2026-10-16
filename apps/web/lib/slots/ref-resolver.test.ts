import { beforeEach, describe, expect, it } from "vitest";
import type { SlotEntry, TemplatePattern } from "@lingua/shared";
import { CEFR_LEVEL, SLOT_LEVEL } from "@lingua/shared";
import { clearSlotCache, loadTemplateFile } from "./loader";
import { resolveRef, resolveTemplate, resolveTemplateFile } from "./ref-resolver";

const ALL_LEVELS = [
  CEFR_LEVEL.A1,
  CEFR_LEVEL.A2,
  CEFR_LEVEL.A2_PLUS,
  CEFR_LEVEL.B1,
  CEFR_LEVEL.B1_PLUS,
  CEFR_LEVEL.B2,
  CEFR_LEVEL.C1,
  CEFR_LEVEL.C2,
] as const;

describe("ref-resolver", () => {
  beforeEach(() => {
    clearSlotCache();
  });

  it("resolveRef returns string array from slots file (A1)", async () => {
    const result = await resolveRef(
      "slots_a1#/slots/present_simple/affirmative/V1",
      CEFR_LEVEL.A1
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => typeof item === "string")).toBe(true);
    expect(result).toContain("commute");
  });

  it("resolveRef returns string array from slots_nouns file (B1)", async () => {
    const result = await resolveRef(
      "slots_nouns_b1#/slots/common/subjects",
      CEFR_LEVEL.B1
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => typeof item === "string")).toBe(true);
  });

  it("resolveRef picks different arrays for basic vs advanced (B2)", async () => {
    const ref = "slots_b2#/slots/perfect_continuous/past_perfect_continuous/V-ing";
    const basic = await resolveRef(ref, CEFR_LEVEL.B2, SLOT_LEVEL.BASIC);
    const advanced = await resolveRef(ref, CEFR_LEVEL.B2, SLOT_LEVEL.ADVANCED);
    expect(basic).toContain("working");
    expect(advanced).toContain("implementing");
    expect(basic).not.toEqual(advanced);
  });

  it("resolveRef throws on invalid $ref format", async () => {
    await expect(resolveRef("invalid", CEFR_LEVEL.B1)).rejects.toThrow(
      /Invalid \$ref/
    );
  });

  it("resolveRef throws when path does not exist", async () => {
    await expect(
      resolveRef("slots_b1#/slots/does_not_exist/affirmative/V1", CEFR_LEVEL.B1)
    ).rejects.toThrow(/path not found/);
  });

  it("resolveTemplate resolves every slot of the first B1 pattern", async () => {
    const file = await loadTemplateFile(CEFR_LEVEL.B1);
    const pattern = file.topics[0]?.subtopics[0]?.patterns[0];
    if (!pattern) {
      throw new Error("B1 template file has no patterns");
    }
    const resolved = await resolveTemplate(pattern, CEFR_LEVEL.B1);

    expect(resolved.id).toBe(pattern.id);
    expect(resolved.pattern).toBe(pattern.pattern);
    expect(resolved.examples).toEqual(pattern.examples);
    expect(Object.keys(resolved.slots).length).toBeGreaterThan(0);
    for (const value of Object.values(resolved.slots)) {
      expect(Array.isArray(value)).toBe(true);
      expect(value.length).toBeGreaterThan(0);
      expect(value.every((item) => typeof item === "string")).toBe(true);
    }
  });

  it("resolveTemplateFile(A1, BASIC) resolves all patterns to arrays", async () => {
    const topics = await resolveTemplateFile(CEFR_LEVEL.A1, SLOT_LEVEL.BASIC);
    expect(topics.length).toBeGreaterThan(0);
    for (const topic of topics) {
      for (const subtopic of topic.subtopics) {
        for (const pattern of subtopic.patterns) {
          for (const value of Object.values(pattern.slots)) {
            expect(Array.isArray(value)).toBe(true);
            expect(value.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("resolveTemplate throws on invalid slot entry", async () => {
    const badPattern: TemplatePattern = {
      id: "bad_01",
      pattern: "X",
      generation_hint: "",
      examples: [],
      slots: { V1: 42 as unknown as SlotEntry },
    };
    await expect(resolveTemplate(badPattern, CEFR_LEVEL.B1)).rejects.toThrow(
      /Invalid slot format/
    );
  });

  it("integration: resolveTemplateFile works for all 8 CEFR levels", async () => {
    for (const level of ALL_LEVELS) {
      const topics = await resolveTemplateFile(level);
      expect(topics.length).toBeGreaterThan(0);
      const patternCount = topics.reduce(
        (sum, topic) =>
          sum + topic.subtopics.reduce((s, sub) => s + sub.patterns.length, 0),
        0
      );
      expect(patternCount).toBeGreaterThan(0);
    }
  });
});
