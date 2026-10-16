import { beforeEach, describe, expect, it } from "vitest";
import { CEFR_LEVEL } from "@lingua/shared";
import {
  clearSlotCache,
  loadNounsFile,
  loadSlotFile,
  loadTemplateFile,
} from "./loader";

describe("slot loader", () => {
  beforeEach(() => {
    clearSlotCache();
  });

  it("loadTemplateFile(A1) returns file with level A1 and topics", async () => {
    const file = await loadTemplateFile(CEFR_LEVEL.A1);
    expect(file.level).toBe("A1");
    expect(Array.isArray(file.topics)).toBe(true);
    expect(file.topics.length).toBeGreaterThan(0);
  });

  it("loadSlotFile(B1) returns file with slots defined", async () => {
    const file = await loadSlotFile(CEFR_LEVEL.B1);
    expect(file).toBeDefined();
    expect("slots" in file).toBe(true);
  });

  it("loadNounsFile(B1) returns file with slots defined", async () => {
    const file = await loadNounsFile(CEFR_LEVEL.B1);
    expect(file).toBeDefined();
    expect("slots" in file).toBe(true);
  });

  it("loadTemplateFile(B2) twice returns same reference (cached)", async () => {
    const first = await loadTemplateFile(CEFR_LEVEL.B2);
    const second = await loadTemplateFile(CEFR_LEVEL.B2);
    expect(first).toBe(second);
  });

  it("loadTemplateFile loads all 8 levels with topics", async () => {
    const levels = [
      CEFR_LEVEL.A1,
      CEFR_LEVEL.A2,
      CEFR_LEVEL.A2_PLUS,
      CEFR_LEVEL.B1,
      CEFR_LEVEL.B1_PLUS,
      CEFR_LEVEL.B2,
      CEFR_LEVEL.C1,
      CEFR_LEVEL.C2,
    ];
    for (const level of levels) {
      const file = await loadTemplateFile(level);
      expect(file.topics.length).toBeGreaterThan(0);
    }
  });

  it("clearSlotCache forces reload (new reference)", async () => {
    const first = await loadTemplateFile(CEFR_LEVEL.A1);
    clearSlotCache();
    const second = await loadTemplateFile(CEFR_LEVEL.A1);
    expect(first).not.toBe(second);
    expect(first.level).toBe(second.level);
  });
});
