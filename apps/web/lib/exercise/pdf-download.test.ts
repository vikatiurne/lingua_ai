import { describe, expect, it } from "vitest";
import { parsePdfFileName } from "./pdf-download";

describe("parsePdfFileName", () => {
  it("returns a fallback name when the header is missing", () => {
    expect(parsePdfFileName(null)).toBe("exercise.pdf");
  });

  it("reads a quoted plain filename", () => {
    expect(
      parsePdfFileName('attachment; filename="practice-Conditionals.pdf"')
    ).toBe("practice-Conditionals.pdf");
  });

  it("prefers the UTF-8 encoded filename", () => {
    expect(
      parsePdfFileName(
        `attachment; filename="practice-ASCII.pdf"; filename*=UTF-8''${encodeURIComponent(
          "practice-Прислівники.pdf"
        )}`
      )
    ).toBe("practice-Прислівники.pdf");
  });

  it("reads an unquoted filename", () => {
    expect(
      parsePdfFileName("attachment; filename=practice-Past-Simple.pdf")
    ).toBe("practice-Past-Simple.pdf");
  });
});
