import { describe, expect, it } from "vitest";

import { LEVEL_SHORT_LABELS, formatLevelCode } from "./level";

describe("formatLevelCode", () => {
  it("returns the level code unchanged when there is no PLUS suffix", () => {
    expect(formatLevelCode("A1")).toBe("A1");
    expect(formatLevelCode("B1")).toBe("B1");
    expect(formatLevelCode("C2")).toBe("C2");
  });

  it("renders PLUS levels with a plus sign instead of an underscore", () => {
    expect(formatLevelCode("A2_PLUS")).toBe("A2+");
    expect(formatLevelCode("B1_PLUS")).toBe("B1+");
  });

  it("never produces an underscore for any CEFR level", () => {
    for (const level of Object.keys(LEVEL_SHORT_LABELS) as Array<keyof typeof LEVEL_SHORT_LABELS>) {
      expect(formatLevelCode(level)).not.toContain("_");
    }
  });
});
