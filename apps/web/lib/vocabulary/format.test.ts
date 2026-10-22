import { describe, expect, it } from "vitest";

import {
  formatDateLabel,
  formatWordCount,
  getDayRange,
  toDateKey,
} from "./format";

describe("toDateKey", () => {
  it("returns the calendar day of a date", () => {
    expect(toDateKey(new Date(2026, 9, 22, 12, 30))).toBe("2026-10-22");
  });

  it("keeps the day of late evening", () => {
    expect(toDateKey(new Date(2026, 9, 22, 23, 59))).toBe("2026-10-22");
  });
});

describe("formatDateLabel", () => {
  it("formats a date in Ukrainian with a capitalized month", () => {
    expect(formatDateLabel("2020-10-22")).toBe("22 Жовтня 2020");
  });

  it("omits the year for the current year", () => {
    const current = toDateKey(new Date());
    expect(formatDateLabel(current)).not.toMatch(/\d{4}$/);
  });

  it("returns the raw key for an invalid date", () => {
    expect(formatDateLabel("not-a-date")).toBe("not-a-date");
    expect(formatDateLabel("2026-02-31")).toBe("2026-02-31");
  });
});

describe("formatWordCount", () => {
  it("uses the singular form for 1", () => {
    expect(formatWordCount(1)).toBe("1 слово");
  });

  it("uses the few form for 2-4", () => {
    expect(formatWordCount(2)).toBe("2 слова");
    expect(formatWordCount(4)).toBe("4 слова");
  });

  it("uses the many form for 0, 5+ and teens", () => {
    expect(formatWordCount(0)).toBe("0 слів");
    expect(formatWordCount(5)).toBe("5 слів");
    expect(formatWordCount(11)).toBe("11 слів");
    expect(formatWordCount(21)).toBe("21 слово");
  });
});

describe("getDayRange", () => {
  it("returns the half-open range of the day", () => {
    const range = getDayRange("2026-10-22");
    expect(range).not.toBeNull();
    expect(range?.start.getDate()).toBe(22);
    expect(range?.start.getHours()).toBe(0);
    expect(range?.end.getDate()).toBe(23);
    expect(range?.end.getHours()).toBe(0);
  });

  it("returns null for an invalid date", () => {
    expect(getDayRange("2026-13-01")).toBeNull();
    expect(getDayRange("nope")).toBeNull();
  });
});
